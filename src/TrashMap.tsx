// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from 'react-leaflet';

const CENTER = [35.243, 129.092];
const STORAGE = 'map_data';

function Picker({ setPoint, point }) {
  useMapEvents({
    click(e) {
      setPoint(e.latlng);
    },
  });

  return point ? (
    <Marker position={point}>
      <Popup>선택 위치</Popup>
    </Marker>
  ) : null;
}

export default function TrashMap() {
  const [name, setName] = useState(localStorage.getItem('name') || '');
  const [input, setInput] = useState('');
  const [data, setData] = useState([]);
  const [point, setPoint] = useState(null);
  const [text, setText] = useState('');
  const [image, setImage] = useState('');
  const [show, setShow] = useState(false);

  const fileRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE);
    if (saved) setData(JSON.parse(saved));
  }, []);

  const save = (d) => {
    localStorage.setItem(STORAGE, JSON.stringify(d));
    setData(d);
  };

  const join = () => {
    localStorage.setItem('name', input);
    setName(input);
  };

  const upload = (e) => {
    const f = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result);
    reader.readAsDataURL(f);
  };

  const removeImage = () => {
    setImage('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const submit = () => {
    if (!point) return alert('위치 선택');

    const newData = [
      {
        id: Date.now(),
        name,
        text,
        image,
        point,
      },
      ...data,
    ];

    save(newData);
    setShow(false);
    setText('');
    setImage('');
    setPoint(null);
  };

  if (!name) {
    return (
      <div style={{ textAlign: 'center', marginTop: 100 }}>
        <h1>사계절 런앤맵</h1>
        <p>금정구의 사계절을 기록하고 함께 지켜나가요</p>
        <input onChange={(e) => setInput(e.target.value)} />
        <button onClick={join}>시작</button>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh' }}>
      <MapContainer center={CENTER} zoom={14} style={{ height: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {data.map((d) => (
          <Marker key={d.id} position={d.point}>
            <Popup>
              {d.text}
              <br />
              {d.name}
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <button
        onClick={() => setShow(true)}
        style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      >
        기록하기
      </button>

      {show && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            background: 'white',
            width: '100%',
          }}
        >
          <MapContainer center={CENTER} zoom={14} style={{ height: 200 }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Picker point={point} setPoint={setPoint} />
          </MapContainer>

          <textarea
            onChange={(e) => setText(e.target.value)}
            placeholder="내용 입력"
          />

          <input ref={fileRef} type="file" onChange={upload} />

          {image && (
            <div>
              <img src={image} width={100} />
              <button onClick={removeImage}>삭제</button>
            </div>
          )}

          <button onClick={submit}>저장</button>
        </div>
      )}
    </div>
  );
}
