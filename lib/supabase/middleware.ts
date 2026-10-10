import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const isDashboardRoute =
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/");

  const isLoginPage = pathname === "/login";

  const isRegistrationPage = pathname === "/register";

  const isLoginVerificationPage =
    pathname === "/login/verify";

  const isRegistrationPinPage =
    pathname === "/register/pin";

  const isForgotPinPage =
    pathname === "/forgot-pin" ||
    pathname.startsWith("/forgot-pin/");

  /*
   * These authentication-flow pages intentionally do not
   * require an authenticated-user check in middleware.
   */
  if (
    isLoginVerificationPage ||
    isRegistrationPinPage ||
    isForgotPinPage
  ) {
    return NextResponse.next({
      request,
    });
  }

  /*
   * Public pages do not need authentication work.
   */
  const needsUserCheck =
    isDashboardRoute ||
    isLoginPage ||
    isRegistrationPage;

  if (!needsUserCheck) {
    return NextResponse.next({
      request,
    });
  }

  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(
            ({ name, value, options }) => {
              response.cookies.set(
                name,
                value,
                options,
              );
            },
          );
        },
      },
    },
  );

  /*
   * Verify the authenticated user using the JWT claims.
   *
   * The result can contain null data, so handle that
   * explicitly instead of destructuring data.claims.
   */
  const { data, error } =
    await supabase.auth.getClaims();

  const claims = data?.claims ?? null;

  /*
   * An authentication error means the request does not
   * have a usable authenticated identity.
   */
  if (error) {
    console.error(
      "[supabase-middleware] getClaims error:",
      error,
    );
  }

  /*
   * ---------------------------------------------------------
   * DASHBOARD PROTECTION
   * ---------------------------------------------------------
   */

  if (!claims && isDashboardRoute) {
    const url = request.nextUrl.clone();

    url.pathname = "/login";
    url.search = "";

    url.searchParams.set(
      "redirect",
      pathname,
    );

    return NextResponse.redirect(url);
  }

  /*
   * ---------------------------------------------------------
   * AUTHENTICATION ENTRY PAGES
   * ---------------------------------------------------------
   */

  if (
    claims &&
    (isLoginPage || isRegistrationPage)
  ) {
    const url = request.nextUrl.clone();

    url.pathname = "/dashboard";
    url.search = "";

    return NextResponse.redirect(url);
  }

  return response;
}