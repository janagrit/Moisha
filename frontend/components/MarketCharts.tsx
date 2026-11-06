import React from 'react';
import { ListingComp, MyListingConfig } from '../types';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell
} from 'recharts';

interface MarketChartsProps {
  comps: ListingComp[];
  myListing: MyListingConfig;
  recommendedPrice: number;
}

export const MarketCharts: React.FC<MarketChartsProps> = ({
  comps,
  myListing,
  recommendedPrice
}) => {
  const chartData = [
    {
      name: 'Your House (1114 Florida)',
      price: myListing.currentPrice,
      isHost: true,
      isBooked: myListing.isBooked,
      rating: 4.95,
    },
    ...comps.map((c) => ({
      name: c.name.length > 18 ? c.name.slice(0, 18) + '...' : c.name,
      price: c.currentPrice,
      isHost: false,
      isBooked: c.isBooked,
      rating: c.rating,
    })),
  ];

  return (
    <div className="bg-white border border-[#E8DFD3] rounded-3xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 border border-amber-300 flex items-center justify-center text-lg shadow-xs">
            📊
          </div>
          <div>
            <h3 className="text-base font-serif font-bold text-blue-950">Florida Ave & NE Neighbor Price Benchmark</h3>
            <p className="text-xs text-slate-500">Live comparison of your rate against neighboring vacant and booked listings</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-blue-700 inline-block" />
            <span className="text-slate-700 font-semibold">Your House</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-500 inline-block" />
            <span className="text-slate-700">Vacant Neighbors</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500/70 inline-block" />
            <span className="text-slate-500">Booked</span>
          </div>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1ECE4" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="#64748b"
              fontSize={11}
              interval={0}
              angle={-15}
              textAnchor="end"
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              domain={[160, 'dataMax + 40']}
              tickFormatter={(v) => `$${v}`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white border border-stone-200 p-3 rounded-xl shadow-lg text-xs">
                      <p className="font-bold text-slate-900 mb-1">{data.name}</p>
                      <p className="text-blue-700 font-mono font-bold text-sm">${data.price}/night</p>
                      <p className="text-slate-500 mt-0.5">
                        Status: {data.isBooked ? 'Booked' : 'Vacant & Competing'}
                      </p>
                      <p className="text-amber-700">Rating: ★ {data.rating}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <ReferenceLine
              y={myListing.floorPrice}
              stroke="#047857"
              strokeDasharray="4 4"
              label={{
                value: `Safety Floor $${myListing.floorPrice}`,
                fill: '#047857',
                fontSize: 10,
                position: 'insideTopRight'
              }}
            />
            <ReferenceLine
              y={recommendedPrice}
              stroke="#D97706"
              strokeDasharray="2 2"
              label={{
                value: `Moisha Target $${recommendedPrice}`,
                fill: '#D97706',
                fontSize: 10,
                position: 'insideBottomRight'
              }}
            />
            <Bar dataKey="price" radius={[6, 6, 0, 0]}>
              {chartData.map((entry, index) => {
                let fill = '#D97706';
                if (entry.isHost) fill = '#1E40AF';
                else if (entry.isBooked) fill = '#10B981';
                return <Cell key={`cell-${index}`} fill={fill} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
