import Link from "next/link";
import { Layout } from "@/components/Layout";

export default function Home() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4">
        {/* Hero block (compressed) - mt-6 from Top Bar */}
        <div className="text-center mt-6">
          <p className="text-lg text-slate-300 mb-2 leading-relaxed">
            When work is done, Veris records the moment of completion.
          </p>
          <h1 className="text-5xl font-bold text-white mt-2 leading-tight">
            Verifiable Delivery Records
          </h1>
          <p className="text-lg text-slate-300 mt-3 leading-relaxed">
            A verifiable record when work is complete.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-4">
            <Link href="/close" className="btn-primary">
              Close Delivery
            </Link>
            <Link href="/check" className="btn-secondary">
              Check Delivery
            </Link>
          </div>
        </div>

        {/* Steps row - mt-6 from CTAs, gap-6 between items */}
        <div className="flex flex-col md:flex-row justify-center items-center mt-6 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-slate-900 mx-auto mb-4 flex items-center justify-center">
              <div className="text-emerald-500 text-2xl">1</div>
            </div>
            <h3 className="text-lg font-semibold text-gray-200 mb-1">Close Delivery</h3>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-slate-900 mx-auto mb-4 flex items-center justify-center">
              <div className="text-emerald-500 text-2xl">2</div>
            </div>
            <h3 className="text-lg font-semibold text-gray-200 mb-1">Record Closure</h3>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-slate-900 mx-auto mb-4 flex items-center justify-center">
              <div className="text-emerald-500 text-2xl">3</div>
            </div>
            <h3 className="text-lg font-semibold text-gray-200 mb-1">Check Delivery</h3>
          </div>
        </div>

        {/* Composite About+FAQ card - mt-6 from steps */}
        <div className="card text-center mt-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-200 mb-4">About this MVP</h2>
          <p className="text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Veris is a public proof‑of‑concept that demonstrates verifiable closure of digital
            deliveries. Records here are temporary and may be purged. Checking deliveries is free
            and public.
          </p>

          {/* Divider inside card */}
          <div className="border-t border-slate-800 mt-6 pt-6">
            <h3 className="text-lg font-semibold text-gray-200 mb-3">Micro FAQ</h3>
            <div className="text-left max-w-2xl mx-auto">
              <div className="mb-4">
                <h4 className="text-base font-semibold text-gray-200 mb-1">
                  What does Close Delivery do?
                </h4>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Creates a verifiable record of completion.
                </p>
              </div>
              <div className="mb-4">
                <h4 className="text-base font-semibold text-gray-200 mb-1">Is my file uploaded?</h4>
                <p className="text-sm text-slate-300 leading-relaxed">
                  No, only a local hash is stored.
                </p>
              </div>
              <div>
                <h4 className="text-base font-semibold text-gray-200 mb-1">
                  How long do records last?
                </h4>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Seven days in this public prototype.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
