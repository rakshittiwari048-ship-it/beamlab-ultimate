import { Helmet } from 'react-helmet-async';

export default function Contact() {
  return (
    <div>
      <Helmet>
        <title>Contact — BeamLab Ultimate</title>
        <meta name="description" content="Get in touch with the BeamLab team for support, billing, or general inquiries." />
      </Helmet>
      <section className="mx-auto max-w-3xl px-4 py-12">
        <h2 className="text-3xl font-bold text-white">Contact</h2>
        <p className="mt-4 text-gray-300">We’d love to hear from you. Reach out anytime.</p>
        <div className="mt-6 panel p-6">
          <div className="text-sm text-gray-300">
            <div>Email: <a className="text-primary-400 hover:text-primary-300" href="mailto:support@beamlab.app">support@beamlab.app</a></div>
            <div className="mt-2">Support hours: Mon–Fri, 10:00–18:00 IST</div>
          </div>
        </div>
      </section>
    </div>
  );
}
