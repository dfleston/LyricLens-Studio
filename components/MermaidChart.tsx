
import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidChartProps {
  chart: string;
  id: string;
}

const MermaidChart: React.FC<MermaidChartProps> = ({ chart, id }) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: 'dark',
      securityLevel: 'loose',
      fontFamily: 'JetBrains Mono',
    });
    
    const renderChart = async () => {
      if (chartRef.current) {
        chartRef.current.innerHTML = '';
        try {
            // Clean common AI formatting issues in mermaid code
            const cleanChart = chart
                .replace(/```mermaid/g, '')
                .replace(/```/g, '')
                .trim();
                
            const { svg } = await mermaid.render(`mermaid-${id}`, cleanChart);
            chartRef.current.innerHTML = svg;
        } catch (error) {
            console.error('Mermaid render error:', error);
            chartRef.current.innerHTML = '<div class="text-red-400 text-xs p-2">Invalid diagram markup</div>';
        }
      }
    };

    renderChart();
  }, [chart, id]);

  return (
    <div className="mermaid-container w-full overflow-hidden flex justify-center bg-slate-900/50 rounded-lg p-4" ref={chartRef} />
  );
};

export default MermaidChart;
