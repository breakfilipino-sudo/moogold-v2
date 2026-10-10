import "server-only";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  try {
    const { prisma } = await import("./lib/prisma");

    await prisma.$queryRaw`SELECT 1`;
    console.log("[prisma] Database connection warmed.");
  } catch (error) {
    console.error("[prisma] Database warm-up failed:", error);
  }
}
