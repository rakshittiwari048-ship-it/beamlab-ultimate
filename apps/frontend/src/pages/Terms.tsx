import { Helmet } from 'react-helmet-async';

export default function Terms() {
  return (
    <div>
      <Helmet>
        <title>Terms of Service — BeamLab Ultimate</title>
        <meta name="description" content="Terms of service for using BeamLab Ultimate." />
      </Helmet>
      <section className="mx-auto max-w-3xl px-4 py-12">
        <h2 className="text-3xl font-bold text-white">Terms of Service</h2>
        <p className="mt-4 text-gray-300">
          By using BeamLab, you agree to our terms including acceptable use, subscription billing via Razorpay, and limitation of liability. The software is provided "as is" without warranty of any kind.
        </p>
        <p className="mt-4 text-gray-300">
          For legal inquiries, contact <a className="text-primary-400 hover:text-primary-300" href="mailto:legal@beamlab.app">legal@beamlab.app</a>.
        </p>
      </section>
    </div>
  );
}
