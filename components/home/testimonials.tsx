"use client";

import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "James Anderson",
    country: "United Kingdom",
    profit: "+28.4%",
    text: "MooGold made investing in gold incredibly simple. Watching my portfolio grow with live market pricing has been a great experience.",
  },
  {
    name: "Sarah Williams",
    country: "South Africa",
    profit: "+19.7%",
    text: "I love that I can invest directly from my wallet instead of being forced into fixed investment plans.",
  },
  {
    name: "Michael Johnson",
    country: "Canada",
    profit: "+34.1%",
    text: "The platform feels professional, secure and transparent. It's now my preferred way to invest in gold.",
  },
];

export default function Testimonials() {
  return (
    <section className="bg-white py-24">

      <div className="mx-auto max-w-7xl px-6">

        <div className="mx-auto mb-16 max-w-3xl text-center">

          <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">
            Trusted by Investors
          </span>

          <h2 className="mt-6 text-4xl font-black text-slate-900 lg:text-5xl">
            Thousands Trust MooGold
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-600">
            Investors around the world use MooGold to build long-term wealth through digital gold.
          </p>

        </div>

        <div className="mb-16 grid gap-6 md:grid-cols-3">

          <div className="rounded-3xl bg-slate-900 p-8 text-center text-white">

            <h3 className="text-5xl font-black">
              4.9
            </h3>

            <div className="mt-4 flex justify-center gap-1">

              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className="h-5 w-5 fill-yellow-400 text-yellow-400"
                />
              ))}

            </div>

            <p className="mt-4 text-slate-300">
              Average Rating
            </p>

          </div>

          <div className="rounded-3xl border border-slate-200 p-8 text-center">

            <h3 className="text-5xl font-black text-emerald-600">
              500K+
            </h3>

            <p className="mt-4 text-slate-600">
              Active Investors
            </p>

          </div>

          <div className="rounded-3xl border border-slate-200 p-8 text-center">

            <h3 className="text-5xl font-black text-emerald-600">
              $2.8B
            </h3>

            <p className="mt-4 text-slate-600">
              Assets Managed
            </p>

          </div>

        </div>

        <div className="grid gap-8 lg:grid-cols-3">

  {testimonials.map((testimonial) => (
            <div
              key={testimonial.name}
              className="group rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-emerald-200 hover:shadow-2xl"
            >
              <div className="flex items-center justify-between">

                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">

                  <Quote className="h-7 w-7 text-emerald-600" />

                </div>

                <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                  {testimonial.profit}
                </span>

              </div>

              <p className="mt-8 leading-8 text-slate-600">
                "{testimonial.text}"
              </p>

              <div className="mt-8 border-t border-slate-200 pt-6">

                <h4 className="text-lg font-bold text-slate-900">
                  {testimonial.name}
                </h4>

                <p className="mt-1 text-slate-500">
                  {testimonial.country}
                </p>

                <div className="mt-4 flex gap-1">

                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      key={index}
                      className="h-4 w-4 fill-yellow-400 text-yellow-400"
                    />
                  ))}

                </div>

              </div>

            </div>
          ))}

        </div>

      </div>

    </section>
  );
}