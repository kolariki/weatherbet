export default function OddsBar({ yesPercentage = 50, noPercentage = 50, size = 'md' }) {
  const height = size === 'lg' ? 'h-8' : size === 'sm' ? 'h-2' : 'h-4';
  const showLabels = size !== 'sm';

  return (
    <div className="w-full">
      <div className={`w-full ${height} rounded-full overflow-hidden flex bg-[#1e2329]`}>
        <div
          className="bg-[#2ebd85] transition-all duration-700 ease-out flex items-center justify-center"
          style={{ width: `${yesPercentage}%` }}
        >
          {showLabels && yesPercentage > 15 && (
            <span className="text-xs font-bold text-white">{yesPercentage}%</span>
          )}
        </div>
        <div
          className="bg-[#f6465d] transition-all duration-700 ease-out flex items-center justify-center"
          style={{ width: `${noPercentage}%` }}
        >
          {showLabels && noPercentage > 15 && (
            <span className="text-xs font-bold text-white">{noPercentage}%</span>
          )}
        </div>
      </div>
      {showLabels && (
        <div className="flex justify-between mt-1.5 text-xs font-medium">
          <span className="text-[#2ebd85]">SÍ {yesPercentage}%</span>
          <span className="text-[#f6465d]">NO {noPercentage}%</span>
        </div>
      )}
    </div>
  );
}
