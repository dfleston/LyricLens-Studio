
import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidChartProps {
  chart: string;
  id: string;
}

const MermaidChart: React.FC<MermaidChartProps> = ({ chart, id }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const renderId = useRef(0);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
      fontFamily: 'JetBrains Mono',
    });
    
    const renderChart = async () => {
      const currentRenderId = ++renderId.current;
      const target = chartRef.current;
      if (!target) return;

      try {
          // Clean common AI formatting issues in mermaid code
          let cleanChart = chart
              .replace(/```mermaid/g, '')
              .replace(/```/g, '')
              .trim();
          
          // Improved aggressive fix for unquoted labels with @ or special chars
          // Wraps content inside [] or () in quotes if it contains @ and isn't already quoted
          cleanChart = cleanChart.replace(/\[([^"\]\n]*@[^"\]\n]*)\]/g, '["$1"]');
          cleanChart = cleanChart.replace(/\(([^"\)\n]*@[^"\)\n]*)\)/g, '("$1")');
          
          // Catch any leftover problematic chars in unquoted node IDs if possible, 
          // though usually it's the labels.
          
          if (!cleanChart.startsWith('graph') && !cleanChart.startsWith('flowchart')) {
            cleanChart = 'graph TD\n' + cleanChart;
          }

          const { svg } = await mermaid.render(`mermaid-${id}-${currentRenderId}`, cleanChart);
          
          if (chartRef.current && currentRenderId === renderId.current) {
            chartRef.current.innerHTML = svg;
          }
      } catch (error) {
          console.error('Mermaid render error:', error);
          if (chartRef.current && currentRenderId === renderId.current) {
            chartRef.current.innerHTML = '<div class="text-red-400 text-[10px] p-2 bg-red-900/20 rounded border border-red-900/50">Syntax error in architectural diagram</div>';
          }
      }
    };

    renderChart();

    return () => {
      renderId.current++;
    };
  }, [chart, id]);

  return (
    <div className="mermaid-container w-full min-h-[100px] overflow-hidden flex justify-center bg-slate-900/50 rounded-lg p-4" ref={chartRef} />
  );
};

export default MermaidChart;
