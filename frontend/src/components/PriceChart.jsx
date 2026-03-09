import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';

/**
 * Professional TradingView-style price chart.
 * Shows YES probability (0-100%) as an area chart with crosshair tooltip.
 */
export default function PriceChart({ data, height = 300 }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const tooltipRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    if (!chartContainerRef.current || !data || data.length < 2) return;

    const container = chartContainerRef.current;

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#848e9c',
        fontSize: 12,
        fontFamily: 'Inter, sans-serif',
      },
      grid: {
        vertLines: { color: '#1e2329', style: 1 },
        horzLines: { color: '#1e2329', style: 1 },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#00b8d4',
          width: 1,
          style: 2,
          labelBackgroundColor: '#00b8d4',
        },
        horzLine: {
          color: '#00b8d4',
          width: 1,
          style: 2,
          labelBackgroundColor: '#00b8d4',
        },
      },
      rightPriceScale: {
        borderColor: '#2b3139',
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: '#2b3139',
        timeVisible: true,
        secondsVisible: false,
        barSpacing: Math.max(6, Math.min(20, container.clientWidth / data.length)),
      },
      handleScroll: { vertTouchDrag: false, mouseWheel: true, pressedMouseMove: true },
      handleScale: { axisPressedMouseMove: { time: true, price: false }, pinch: true },
      width: container.clientWidth,
      height,
    });

    chartRef.current = chart;

    // YES price area series
    const areaSeries = chart.addAreaSeries({
      topColor: 'rgba(0, 184, 212, 0.4)',
      bottomColor: 'rgba(0, 184, 212, 0.02)',
      lineColor: '#00b8d4',
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 5,
      crosshairMarkerBorderColor: '#00b8d4',
      crosshairMarkerBackgroundColor: '#0b0e11',
      crosshairMarkerBorderWidth: 2,
      priceFormat: {
        type: 'custom',
        formatter: (price) => price.toFixed(1) + '%',
      },
    });

    // NO price line series (subtle)
    const noSeries = chart.addLineSeries({
      color: '#f6465d',
      lineWidth: 1,
      lineStyle: 2, // dashed
      crosshairMarkerVisible: false,
      priceLineVisible: false,
      lastValueVisible: false,
      priceFormat: {
        type: 'custom',
        formatter: (price) => price.toFixed(1) + '%',
      },
    });

    // Transform data
    const yesData = data.map((d) => ({
      time: Math.floor(new Date(d.created_at).getTime() / 1000),
      value: d.yes_price * 100,
    }));

    const noData = data.map((d) => ({
      time: Math.floor(new Date(d.created_at).getTime() / 1000),
      value: (d.no_price || (1 - d.yes_price)) * 100,
    }));

    // Dedup timestamps (lightweight-charts requires unique ascending times)
    const dedupYes = [];
    const dedupNo = [];
    const seenTimes = new Set();
    for (let i = 0; i < yesData.length; i++) {
      let t = yesData[i].time;
      while (seenTimes.has(t)) t++;
      seenTimes.add(t);
      dedupYes.push({ time: t, value: yesData[i].value });
      dedupNo.push({ time: t, value: noData[i]?.value || 50 });
    }

    areaSeries.setData(dedupYes);
    noSeries.setData(dedupNo);

    // Fit content
    chart.timeScale().fitContent();

    // Crosshair tooltip
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData.size) {
        setTooltip(null);
        return;
      }

      const yesVal = param.seriesData.get(areaSeries);
      const noVal = param.seriesData.get(noSeries);
      const date = new Date(param.time * 1000);

      setTooltip({
        yes: yesVal?.value?.toFixed(1),
        no: noVal?.value?.toFixed(1),
        time: date.toLocaleString('es-AR', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }),
        x: param.point?.x,
        y: param.point?.y,
      });
    });

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chart.applyOptions({ width: entry.contentRect.width });
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [data, height]);

  if (!data || data.length < 2) {
    return (
      <div className="flex items-center justify-center h-[200px] text-[#5e6673] text-sm">
        No hay suficientes datos para mostrar el gráfico
      </div>
    );
  }

  // Calculate stats
  const firstPrice = data[0].yes_price * 100;
  const lastPrice = data[data.length - 1].yes_price * 100;
  const change = lastPrice - firstPrice;
  const changePercent = ((change / firstPrice) * 100);

  return (
    <div className="relative">
      {/* Stats bar */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#848e9c]">SÍ</span>
          <span className="text-lg font-bold text-[#00b8d4]">{lastPrice.toFixed(1)}%</span>
        </div>
        <div className={`flex items-center gap-1 text-sm font-medium ${change >= 0 ? 'text-[#2ebd85]' : 'text-[#f6465d]'}`}>
          {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
          <span className="text-xs text-[#5e6673]">
            ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(1)}%)
          </span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="w-3 h-0.5 bg-[#00b8d4] rounded-full inline-block" />
          <span className="text-[10px] text-[#5e6673]">SÍ</span>
          <span className="w-3 h-0.5 bg-[#f6465d] rounded-full inline-block ml-2" style={{ opacity: 0.5 }} />
          <span className="text-[10px] text-[#5e6673]">NO</span>
        </div>
      </div>

      {/* Chart container */}
      <div ref={chartContainerRef} className="w-full" style={{ height }} />

      {/* Custom floating tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none bg-[#161a1e] border border-[#2b3139] rounded-lg px-3 py-2 shadow-xl shadow-black/40 z-10"
          style={{
            left: Math.min(tooltip.x + 16, (chartContainerRef.current?.clientWidth || 400) - 160),
            top: Math.max(tooltip.y - 60, 40),
          }}
        >
          <p className="text-[10px] text-[#5e6673] mb-1">{tooltip.time}</p>
          <div className="flex items-center gap-3">
            <div>
              <span className="text-[10px] text-[#848e9c]">SÍ </span>
              <span className="text-sm font-bold text-[#00b8d4]">{tooltip.yes}%</span>
            </div>
            <div>
              <span className="text-[10px] text-[#848e9c]">NO </span>
              <span className="text-sm font-bold text-[#f6465d]">{tooltip.no}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
