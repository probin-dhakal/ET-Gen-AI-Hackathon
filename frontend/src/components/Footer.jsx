import React from 'react';

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-gray-50 mt-12">
      <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <h3 className="text-lg font-bold text-[#cc0000] mb-3">ET Newsroom</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Real-time market intelligence, policy updates, and business insights curated for modern readers.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-gray-700 mb-3">Top Sections</h4>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>Markets</li>
            <li>Startups</li>
            <li>Policy & Economy</li>
            <li>Global Business</li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-gray-700 mb-3">Tools</h4>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>Personalized Feed</li>
            <li>Story Arc Tracker</li>
            <li>AI Briefings</li>
            <li>News Navigator</li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-gray-700 mb-3">Newsletter</h4>
          <p className="text-sm text-gray-600 mb-3">Get the top 5 business headlines in your inbox every morning.</p>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="you@example.com"
              className="flex-1 min-w-0 rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#cc0000]"
            />
            <button
              type="button"
              className="rounded bg-[#cc0000] text-white px-4 py-2 text-sm font-semibold hover:bg-[#a80000] transition-colors"
            >
              Subscribe
            </button>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row gap-2 md:items-center md:justify-between text-xs text-gray-500">
          <p>© {year} ET Newsroom. All rights reserved.</p>
          <p>Editorial Standards | Privacy | Terms</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;