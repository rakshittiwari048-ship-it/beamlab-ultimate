import { Helmet } from 'react-helmet-async';

export default function Privacy() {
  return (
    <div>
      <Helmet>
        <title>Privacy Policy — BeamLab Ultimate</title>
        <meta name="description" content="Privacy policy detailing data collection and usage for BeamLab Ultimate." />
      </Helmet>
      <section className="mx-auto max-w-3xl px-4 py-12">
        <h2 className="text-3xl font-bold text-white">Privacy Policy</h2>
        <p className="mt-4 text-gray-300">
          We respect your privacy. BeamLab stores only the data necessary to provide the service, including account information and models you create. Payment information is handled by Razorpay and never stored on our servers.
        </p>
        <p className="mt-4 text-gray-300">
          For questions, contact <a className="text-primary-400 hover:text-primary-300" href="mailto:privacy@beamlab.app">privacy@beamlab.app</a>.
        </p>
      </section>
    </div>
  );
}
