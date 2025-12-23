import { Helmet } from 'react-helmet-async';
import { NavLink } from 'react-router-dom';

export default function Pricing() {
  return (
    <div>
      <Helmet>
        <title>Pricing — BeamLab Ultimate</title>
        <meta name="description" content="Transparent pricing for BeamLab Ultimate. Pro and Enterprise plans with Razorpay subscriptions." />
      </Helmet>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="text-3xl font-bold text-white">Simple, transparent pricing</h2>
        <p className="mt-2 text-gray-300">Pay monthly via Razorpay. Cancel anytime.</p>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="panel p-6">
            <h3 className="text-xl font-semibold text-white">Pro</h3>
            <p className="mt-1 text-gray-400">Ideal for individual engineers</p>
            <div className="mt-4 text-4xl font-extrabold text-white">₹2,499<span className="text-base text-gray-400">/month</span></div>
            <ul className="mt-4 text-sm text-gray-300 space-y-2">
              <li>• Unlimited models</li>
              <li>• Fast analysis engine</li>
              <li>• Basic steel design checks</li>
              <li>• Report export (PDF)</li>
            </ul>
            <NavLink to="/app" className="mt-6 inline-block btn-primary">Start with Pro</NavLink>
          </div>
          <div className="panel p-6 border-primary-600">
            <h3 className="text-xl font-semibold text-white">Enterprise</h3>
            <p className="mt-1 text-gray-400">For teams and consultants</p>
            <div className="mt-4 text-4xl font-extrabold text-white">₹9,999<span className="text-base text-gray-400">/month</span></div>
            <ul className="mt-4 text-sm text-gray-300 space-y-2">
              <li>• Everything in Pro</li>
              <li>• Advanced steel design engine</li>
              <li>• Priority support</li>
              <li>• Team collaboration</li>
            </ul>
            <NavLink to="/app" className="mt-6 inline-block btn-primary">Upgrade to Enterprise</NavLink>
          </div>
        </div>

        <div className="mt-8 text-sm text-gray-400">Payments handled securely by Razorpay. GST invoices available.</div>
      </section>
    </div>
  );
}
