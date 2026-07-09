import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors, radius } from '@/theme';

export function toTVSymbol(ticker: string, market: 'KRX' | 'US'): string {
  return market === 'KRX' ? `KRX:${ticker}` : ticker;
}

export function TVChart({ ticker, market, height = 220 }: { ticker: string; market: 'KRX' | 'US'; height?: number }) {
  const symbol = toTVSymbol(ticker, market);
  const html = `<!doctype html><html><body style="margin:0;background:${colors.canvasDark}">
    <div class="tradingview-widget-container">
      <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js" async>
      {"symbol":"${symbol}","width":"100%","height":"${height}","locale":"kr","dateRange":"3M","colorTheme":"dark","isTransparent":true,"autosize":false}
      </script>
    </div></body></html>`;
  return (
    <View style={{ height, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surfaceCardDark }}>
      <WebView source={{ html }} style={{ backgroundColor: 'transparent' }} scrollEnabled={false} />
    </View>
  );
}
