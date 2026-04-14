import React from 'react';
import ReactDOM from 'react-dom/client';
import TrashMap from './TrashMap';
import 'leaflet/dist/leaflet.css';
import './index.css';

import { registerSW } from 'virtual:pwa-register';

registerSW({
  onNeedRefresh() {
    console.log('새로운 버전이 있습니다.');
  },
  onOfflineReady() {
    console.log('오프라인 사용 준비 완료');
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TrashMap />
  </React.StrictMode>
);