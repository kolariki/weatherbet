export default function OddsBar({ yesPercentage = 50, noPercentage = 50, size = 'md' }) {
  const height = size === 'lg' ? 'h-8' : size === 'sm' ? 'h-2' : 'h-4';
  const showLabels = size !== 'sm';

  return (
    <div className="w-full">
      <div className={`w-full ${height} rounded-full overflow-hidden flex bg-gray-800`}>
        <div
          className="bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700 ease-out flex items-center justify-center"
          style={{ width: `${yesPercentage}%` }}
        >
          {showLabels && yesPercentage > 15 && (
            <span className="text-xs font-bold text-white drop-shadow">{yesPercentage}%</span>
          )}
        </div>
        <div
          className="bg-gradient-to-r from-red-400 to-red-500 transition-all duration-700 ease-out flex items-center justify-center"
          style={{ width: `${noPercentage}%` }}
        >
          {showLabels && noPercentage > 15 && (
            <span className="text-xs font-bold text-white drop-shadow">{noPercentage}%</span>
          )}
        </div>
      </div>
      {showLabels && (
        <div className="flex justify-between mt-1.5 text-xs font-medium">
          <span className="text-emerald-400">SÍ {yesPercentage}%</span>
          <span className="text-red-400">NO {noPercentage}%</span>
        </div>
      )}
    </div>
  );
}
