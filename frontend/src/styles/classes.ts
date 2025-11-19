/**
 * Shared CSS class constants for consistent styling across the application
 */

export const buttonClasses = {
  primary: 'px-8 py-4 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white rounded-2xl hover:from-purple-500 hover:via-blue-500 hover:to-cyan-500 transition-all duration-200 font-semibold shadow-md shadow-purple-500/20 hover:shadow-md hover:shadow-purple-500/30 transform hover:scale-105',
  primaryDisabled: 'px-8 py-4 bg-gradient-to-r from-gray-700 via-gray-700 to-gray-700 text-white rounded-2xl cursor-not-allowed transition-all duration-200 font-semibold shadow-sm',
  secondary: 'px-5 py-2.5 bg-black/60 backdrop-blur-sm border-2 border-purple-500/30 rounded-xl hover:bg-purple-500/20 hover:border-purple-400 transition-all duration-200 font-semibold shadow-sm hover:shadow-md text-purple-200',
  secondaryDisabled: 'px-5 py-2.5 bg-black/60 backdrop-blur-sm border-2 border-purple-500/30 rounded-xl opacity-50 cursor-not-allowed transition-all duration-200 font-semibold shadow-sm text-purple-200',
  clear: 'px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border-2 border-purple-500/30 hover:border-purple-400 rounded-xl text-purple-200 font-medium transition-all duration-200 whitespace-nowrap',
  icon: 'p-2 rounded-full hover:bg-purple-500/20 transition-all duration-200',
  iconDanger: 'p-2 rounded-full hover:bg-red-900/30 transition-all duration-200',
  tab: 'px-6 py-2.5 font-semibold transition-all duration-200 rounded-xl',
  tabActive: 'bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white shadow-md shadow-purple-500/20',
  tabInactive: 'text-purple-300 hover:text-white hover:bg-purple-500/20',
};

export const cardClasses = {
  container: 'bg-black/60 backdrop-blur-md rounded-3xl shadow-2xl border border-purple-500/30',
  containerHover: 'bg-black/60 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden hover:shadow-[0_0_30px_rgba(147,51,234,0.4)] transition-all duration-300 flex flex-col transform hover:-translate-y-1 border border-purple-500/30',
  header: 'bg-black/60 backdrop-blur-md shadow-2xl sticky top-0 z-40 relative border-b border-purple-500/30',
  section: 'bg-black/60 backdrop-blur-md rounded-2xl shadow-xl border border-purple-500/30 p-4',
};

export const badgeClasses = {
  keyword: 'px-3 py-1 bg-gradient-to-r from-purple-500/30 to-blue-500/30 text-purple-200 border border-purple-400/30 rounded-full text-xs font-semibold shadow-sm backdrop-blur-sm',
  keywordLarge: 'px-4 py-2 bg-gradient-to-r from-purple-500/30 to-blue-500/30 text-purple-200 border border-purple-400/30 rounded-full text-sm font-semibold shadow-sm backdrop-blur-sm',
  metadata: 'flex items-center gap-2 px-4 py-2 bg-purple-900/30 backdrop-blur-sm border border-purple-500/30 rounded-full text-sm font-semibold text-purple-200',
  metadataBlue: 'flex items-center gap-2 px-4 py-2 bg-blue-900/30 backdrop-blur-sm border border-blue-500/30 rounded-full text-sm font-semibold text-blue-200',
  metadataCyan: 'flex items-center gap-2 px-4 py-2 bg-cyan-900/30 backdrop-blur-sm border border-cyan-500/30 rounded-full text-sm font-semibold text-cyan-200',
  confidence: {
    high: 'bg-gradient-to-r from-green-400 to-emerald-500 text-white',
    medium: 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white',
    low: 'bg-gradient-to-r from-red-400 to-rose-500 text-white',
  },
  count: 'px-2.5 py-0.5 bg-purple-500/40 backdrop-blur-sm text-white rounded-full text-xs font-bold border border-purple-400/30',
  timestamp: 'flex items-center gap-1.5 px-3 py-1 bg-purple-900/30 border border-purple-500/30 rounded-full backdrop-blur-sm',
  resultCount: 'flex items-center gap-1.5 px-3 py-1 bg-blue-900/30 border border-blue-500/30 text-blue-200 rounded-full font-semibold backdrop-blur-sm',
};

export const textClasses = {
  heading: 'text-4xl md:text-5xl font-extrabold tracking-wide',
  headingGradient: 'bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(147,51,234,0.5)]',
  heading2: 'text-2xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent',
  heading3: 'text-xl font-bold text-purple-200',
  title: 'text-lg font-bold text-purple-100',
  body: 'text-purple-200/80',
  bodyLight: 'text-purple-100/90',
  muted: 'text-purple-300/70',
  mutedLight: 'text-purple-300/80',
  error: 'text-red-300',
  warning: 'text-yellow-200',
};

export const inputClasses = {
  text: 'w-full px-5 py-4 pl-14 bg-black/60 backdrop-blur-md border-2 border-purple-500/30 rounded-2xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/30 transition-all duration-200 text-lg shadow-xl hover:shadow-2xl text-purple-100 placeholder-purple-400/50',
};

export const alertClasses = {
  error: 'p-4 bg-red-900/30 backdrop-blur-sm border-2 border-red-500/50 text-red-300 rounded-2xl shadow-lg',
  warning: 'p-4 bg-yellow-900/20 backdrop-blur-sm border-2 border-yellow-500/30 rounded-2xl shadow-lg',
  info: 'p-4 bg-blue-900/20 backdrop-blur-sm border-2 border-blue-500/30 rounded-2xl shadow-lg',
};

export const emptyStateClasses = {
  container: 'text-center py-12 text-purple-300/70 bg-black/60 backdrop-blur-md rounded-3xl shadow-xl border border-purple-500/30',
  text: 'text-lg',
};

