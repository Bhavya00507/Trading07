// src/services/indicatorRegistry.ts

import { ChartDataPoint, SeriesPoint } from './indicatorCalcs';

export interface IndicatorConfig {
  id: string;
  name: string;
  category: 'Trend' | 'Momentum' | 'Volatility' | 'Volume' | 'Custom';
  overlay: boolean;
  inputs: Record<string, any>;
  style: {
    color: string;
    lineWidth: number;
    lineStyle: 'solid' | 'dashed' | 'dotted';
    visible: boolean;
  };
}

export interface CustomIndicatorPlugin {
  name: string;
  category: IndicatorConfig['category'];
  overlay: boolean;
  defaultInputs: Record<string, any>;
  calculate: (data: ChartDataPoint[], inputs: Record<string, any>) => SeriesPoint[] | Record<string, SeriesPoint[]>;
}

class IndicatorRegistry {
  private plugins: Map<string, CustomIndicatorPlugin> = new Map();
  private favorites: Set<string> = new Set();

  registerPlugin(id: string, plugin: CustomIndicatorPlugin) {
    this.plugins.set(id, plugin);
  }

  getPlugin(id: string): CustomIndicatorPlugin | undefined {
    return this.plugins.get(id);
  }

  listPlugins(): { id: string; plugin: CustomIndicatorPlugin }[] {
    return Array.from(this.plugins.entries()).map(([id, plugin]) => ({ id, plugin }));
  }

  toggleFavorite(id: string) {
    if (this.favorites.has(id)) {
      this.favorites.delete(id);
    } else {
      this.favorites.add(id);
    }
  }

  isFavorite(id: string): boolean {
    return this.favorites.has(id);
  }
}

export const indicatorRegistry = new IndicatorRegistry();
