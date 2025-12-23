import { Helmet } from 'react-helmet-async';

export default function About() {
  return (
    <div>
      <Helmet>
        <title>About — BeamLab Ultimate</title>
        <meta name="description" content="BeamLab Ultimate is a modern structural analysis platform built with performance and simplicity for Indian engineers." />
      </Helmet>
      <section className="mx-auto max-w-3xl px-4 py-12">
        <h2 className="text-3xl font-bold text-white">About BeamLab</h2>
        <p className="mt-4 text-gray-300">
          BeamLab Ultimate is engineered to make structural analysis fast, intuitive, and accessible. Our mission is to empower civil and structural engineers with tools that feel modern and deliver accurate results.
        </p>
        <p className="mt-4 text-gray-300">
          Built with cutting-edge web technologies, BeamLab runs in the browser, supports large models, and integrates with Indian payment systems out of the box.
        </p>
      </section>
    </div>
  );
}
