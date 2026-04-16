// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { onAuthStateChanged, signInAnonymously, signOut } from "firebase/auth";
import { auth, db } from "./firebase";
import { onValue, push, ref, remove, update } from "firebase/database";
import logo from "./assets/logo.png";

const BG = "#edf8f1";
const GREEN = "#19c37d";
const NAVY = "#162544";
const BORDER = "#d7eee1";
const LIGHT_TEXT = "#9aa7b6";

const NAME_KEY = "four_seasons_run_map_name_v7";
const DEFAULT_CENTER: [number, number] = [35.243, 129.092];
const ADMIN_NAME = "admin";
const ADMIN_CODE = "1234";

const AREAS = [
  "부산대/장전동",
  "온천천/부곡동",
  "구서/남산동",
  "금사/서동",
  "금정산/노포동",
];

const CATEGORIES = [
  { id: "cup", label: "일회용 컵", icon: "🥤", color: "#19c37d" },
  { id: "smoke", label: "담배꽁초", icon: "🚬", color: "#f59e0b" },
  { id: "plastic", label: "플라스틱", icon: "🧴", color: "#3b82f6" },
  { id: "vinyl", label: "비닐", icon: "🛍️", color: "#06b6d4" },
  { id: "bulky", label: "대형 폐기물", icon: "📦", color: "#8b5cf6" },
  { id: "etc", label: "기타 쓰레기", icon: "❓", color: "#64748b" },
];

function getCategory(categoryId: string) {
  return CATEGORIES.find((c) => c.id === categoryId) || CATEGORIES[CATEGORIES.length - 1];
}

function makeMarkerIcon(categoryId: string) {
  const cat = getCategory(categoryId);
  return L.divIcon({
    className: "trash-map-marker",
    html: `
      <div style="
        width:32px;
        height:32px;
        border-radius:10px;
        background:${cat.color};
        color:white;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:16px;
        border:3px solid white;
        transform:rotate(45deg);
        box-shadow:0 6px 14px rgba(0,0,0,0.18);
      ">
        <div style="transform:rotate(-45deg)">${cat.icon}</div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

function makePickerIcon() {
  return L.divIcon({
    className: "trash-map-picker",
    html: `
      <div style="
        width:20px;
        height:20px;
        border-radius:50%;
        background:#ef4444;
        border:3px solid white;
        box-shadow:0 2px 8px rgba(0,0,0,0.25);
      "></div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function makeCurrentLocationIcon() {
  return L.divIcon({
    className: "current-location-marker",
    html: `
      <div style="
        position: relative;
        width: 22px;
        height: 22px;
        display:flex;
        align-items:center;
        justify-content:center;
      ">
        <div style="
          position:absolute;
          width:22px;
          height:22px;
          border-radius:50%;
          background:rgba(59,130,246,0.22);
          animation:pulseLocation 2s ease-out infinite;
        "></div>
        <div style="
          width:12px;
          height:12px;
          border-radius:50%;
          background:#2563eb;
          border:3px solid white;
          box-shadow:0 3px 10px rgba(37,99,235,0.35);
          z-index:2;
        "></div>
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -10],
  });
}

function ShieldLogo() {
  return (
    <div
      style={{
        width: 38,
        height: 38,
        borderRadius: 12,
        background: GREEN,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 12px rgba(25,195,125,0.22)",
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2L19 5V11C19 16 15.8 20.4 12 22C8.2 20.4 5 16 5 11V5L12 2Z"
          stroke="white"
          strokeWidth="2"
        />
        <path
          d="M9.2 12.1L11 13.9L14.8 10.1"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function MapNavIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 21C16 16.7 18 13.5 18 10.5C18 6.9 15.3 4 12 4C8.7 4 6 6.9 6 10.5C6 13.5 8 16.7 12 21Z"
        stroke={active ? GREEN : "#b7c0ce"}
        strokeWidth="2.2"
      />
      <circle cx="12" cy="10" r="2.4" fill={active ? GREEN : "#b7c0ce"} />
    </svg>
  );
}

function ListNavIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="6" cy="7" r="1.5" fill={active ? GREEN : "#b7c0ce"} />
      <circle cx="6" cy="12" r="1.5" fill={active ? GREEN : "#b7c0ce"} />
      <circle cx="6" cy="17" r="1.5" fill={active ? GREEN : "#b7c0ce"} />
      <path
        d="M10 7H18M10 12H18M10 17H18"
        stroke={active ? GREEN : "#b7c0ce"}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StatsNavIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 19V11M10 19V6M15 19V13M20 19V9"
        stroke={active ? GREEN : "#b7c0ce"}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M3 19H22"
        stroke={active ? GREEN : "#b7c0ce"}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ClickLocationPicker({
  selectedLocation,
  onChange,
}: {
  selectedLocation: { lat: number; lng: number } | null;
  onChange: (loc: { lat: number; lng: number }) => void;
}) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });

  if (!selectedLocation) return null;

  return (
    <Marker position={[selectedLocation.lat, selectedLocation.lng]} icon={makePickerIcon()}>
      <Popup>선택한 위치</Popup>
    </Marker>
  );
}

function CurrentLocationMarker({
  currentLocation,
}: {
  currentLocation: { lat: number; lng: number } | null;
}) {
  if (!currentLocation) return null;

  return (
    <Marker position={[currentLocation.lat, currentLocation.lng]} icon={makeCurrentLocationIcon()}>
      <Popup>현재 위치</Popup>
    </Marker>
  );
}

function RecenterMap({
  targetLocation,
  zoom = 16,
}: {
  targetLocation: { lat: number; lng: number } | null;
  zoom?: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!targetLocation) return;
    map.flyTo([targetLocation.lat, targetLocation.lng], zoom, {
      animate: true,
      duration: 0.8,
    });
  }, [targetLocation, zoom, map]);

  return null;
}

function InitialMapFollow({
  currentLocation,
  activeTab,
}: {
  currentLocation: { lat: number; lng: number } | null;
  activeTab: string;
}) {
  const map = useMap();
  const hasMovedRef = useRef(false);

  useEffect(() => {
    if (!currentLocation || activeTab !== "map" || hasMovedRef.current) return;
    map.setView([currentLocation.lat, currentLocation.lng], 16, { animate: true });
    hasMovedRef.current = true;
  }, [currentLocation, activeTab, map]);

  return null;
}

function Header({
  nickname,
  isAdmin,
  onLogout,
}: {
  nickname: string;
  isAdmin: boolean;
  onLogout: () => void;
}) {
  return (
    <header style={styles.headerBar}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <ShieldLogo />
        <div style={{ fontSize: 20, fontWeight: 900, color: NAVY, letterSpacing: "-0.02em" }}>
          FOUR SEASONS
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {isAdmin ? <div style={styles.adminPill}>Admin</div> : <div style={styles.userPill}>{nickname}</div>}
        <button onClick={onLogout} style={styles.logoutButton} aria-label="로그아웃">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M10 7L15 12L10 17"
              stroke="#b8c1cf"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M15 12H4" stroke="#b8c1cf" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </header>
  );
}

function BottomNav({
  activeTab,
  setActiveTab,
}: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}) {
  const items = [
    { key: "map", label: "지도", icon: <MapNavIcon active={activeTab === "map"} /> },
    { key: "list", label: "피드", icon: <ListNavIcon active={activeTab === "list"} /> },
    { key: "stats", label: "통계", icon: <StatsNavIcon active={activeTab === "stats"} /> },
  ];

  return (
    <nav style={styles.bottomNav}>
      {items.map((item) => (
        <button key={item.key} onClick={() => setActiveTab(item.key)} style={styles.navItemButton}>
          {item.icon}
          <span style={{ ...styles.navLabel, color: activeTab === item.key ? GREEN : "#c2cad7" }}>
            {item.label}
          </span>
        </button>
      ))}
    </nav>
  );
}

async function compressImage(file: File, maxWidth = 1280, maxHeight = 1280, quality = 0.82): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });

  let { width, height } = img;
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
  width = Math.round(width * ratio);
  height = Math.round(height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;

  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

export default function TrashMap() {
  const [nickname, setNickname] = useState("");
  const [nicknameInput, setNicknameInput] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [savedAdminCode, setSavedAdminCode] = useState(localStorage.getItem("four_seasons_admin_code") || "");
  const [user, setUser] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("map");
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [message, setMessage] = useState("");
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [miniMapTarget, setMiniMapTarget] = useState<{ lat: number; lng: number } | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const [formData, setFormData] = useState({
    category: "cup",
    area: AREAS[0],
    description: "",
    image: "",
    location: null as { lat: number; lng: number } | null,
  });

  useEffect(() => {
    setNickname(localStorage.getItem(NAME_KEY) || "");
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        try {
          const result = await signInAnonymously(auth);
          setUser(result.user);
        } catch (error: any) {
          console.error("익명 로그인 실패:", error);
          setMessage(`로그인 실패: ${error.code || "unknown-error"}`);
        }
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    const reportsRef = ref(db, "reports");
    const unsub = onValue(
      reportsRef,
      (snapshot) => {
        const data = snapshot.val();
        if (!data) {
          setReports([]);
          return;
        }

        const items = Object.entries(data).map(([id, value]: any) => ({
          id,
          ...value,
        }));

        items.sort((a: any, b: any) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
        setReports(items);
      },
      (error) => {
        console.error(error);
        setMessage("실시간 데이터 연결에 실패했습니다.");
      }
    );

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const next = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setCurrentLocation(next);
      },
      () => {},
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 15000,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 2200);
    return () => clearTimeout(timer);
  }, [message]);

  const isAdmin = nickname.trim().toLowerCase() === ADMIN_NAME && savedAdminCode === ADMIN_CODE;

  const stats = useMemo(() => {
    const solved = reports.filter((r) => r.status === "solved").length;
    const pending = reports.length - solved;

    const categoryCounts = CATEGORIES.map((category) => ({
      ...category,
      count: reports.filter((r) => r.category === category.id).length,
    }));

    return {
      total: reports.length,
      solved,
      pending,
      categoryCounts,
    };
  }, [reports]);

  const resetForm = () => {
    setEditingReportId(null);
    setMiniMapTarget(null);
    setFormData({
      category: "cup",
      area: AREAS[0],
      description: "",
      image: "",
      location: null,
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const removeSelectedImage = () => {
    setFormData((prev) => ({ ...prev, image: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    setMessage("사진이 삭제되었습니다.");
  };

  const handleStartEdit = (report: any) => {
    const isOwner = !!user && report.uid === user.uid;
    if (!isAdmin && !isOwner) {
      setMessage("수정 권한이 없습니다.");
      return;
    }

    setEditingReportId(report.id);
    setMiniMapTarget(report.location || null);
    setFormData({
      category: report.category || "cup",
      area: report.area || AREAS[0],
      description: report.description || "",
      image: report.image || "",
      location: report.location || null,
    });
    setShowAddSheet(true);
  };

  const handleJoin = (e: any) => {
    e.preventDefault();
    const value = nicknameInput.trim();

    if (!value) {
      setMessage("닉네임을 입력해 주세요.");
      return;
    }

    if (value.toLowerCase() === ADMIN_NAME && adminCode !== ADMIN_CODE) {
      setMessage("관리자 코드가 올바르지 않습니다.");
      return;
    }

    localStorage.setItem(NAME_KEY, value);
    localStorage.setItem("four_seasons_admin_code", adminCode);
    setNickname(value);
    setSavedAdminCode(adminCode);
    setMessage("입장 완료");
  };

  const handleLogout = async () => {
    localStorage.removeItem(NAME_KEY);
    localStorage.removeItem("four_seasons_admin_code");
    setNickname("");
    setNicknameInput("");
    setAdminCode("");
    setSavedAdminCode("");
    setShowAddSheet(false);
    resetForm();
    try {
      await signOut(auth);
    } catch (error) {
      console.error(error);
    }
    setMessage("로그아웃 되었습니다.");
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage("이 브라우저에서는 위치 기능을 지원하지 않습니다.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setCurrentLocation(next);
        setMiniMapTarget(next);
        setFormData((prev) => ({
          ...prev,
          location: next,
        }));
        setMessage("현재 위치를 불러왔습니다.");
      },
      () => {
        setMessage("위치 권한을 허용해 주세요.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleImageChange = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage("이미지 파일만 올릴 수 있습니다.");
      return;
    }

    try {
      const compressed = await compressImage(file);
      setFormData((prev) => ({ ...prev, image: compressed }));
      setMessage("사진이 첨부되었습니다.");
    } catch (error) {
      console.error(error);
      setMessage("사진 처리에 실패했습니다.");
    }
  };

  const handleSave = async () => {
    if (!nickname) {
      setMessage("닉네임이 필요합니다.");
      return;
    }

    if (!user) {
      setMessage("로그인 연결 중입니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    if (!formData.location) {
      setMessage("작은 지도에서 위치를 한 번 눌러 주세요.");
      return;
    }

    const payload = {
      category: formData.category,
      area: formData.area,
      description: formData.description.trim() || "내용 없음",
      image: formData.image || "",
      location: formData.location,
    };

    if (editingReportId) {
      const target = reports.find((r) => r.id === editingReportId);
      if (!target) {
        setMessage("수정할 기록을 찾을 수 없습니다.");
        return;
      }

      const isOwner = !!user && target.uid === user.uid;
      if (!isAdmin && !isOwner) {
        setMessage("수정 권한이 없습니다.");
        return;
      }

      try {
        await update(ref(db, `reports/${editingReportId}`), {
          ...payload,
          updatedAtMs: Date.now(),
        });
        resetForm();
        setShowAddSheet(false);
        setMessage("수정이 완료되었습니다.");
      } catch (error) {
        console.error(error);
        setMessage("수정에 실패했습니다.");
      }
      return;
    }

    const reportData = {
      uid: user.uid,
      userName: nickname,
      ...payload,
      status: "pending",
      createdAtMs: Date.now(),
    };

    try {
      await push(ref(db, "reports"), reportData);
      resetForm();
      setShowAddSheet(false);
      setActiveTab("map");
      setMessage("업로드 완료");
    } catch (error) {
      console.error(error);

      if (formData.image) {
        try {
          await push(ref(db, "reports"), {
            ...reportData,
            image: "",
          });
          resetForm();
          setShowAddSheet(false);
          setActiveTab("map");
          setMessage("사진 없이 업로드 완료");
          return;
        } catch (retryError) {
          console.error(retryError);
        }
      }

      setMessage("저장에 실패했습니다.");
    }
  };

  const handleDelete = async (id: string) => {
    const ok = window.confirm("이 기록을 삭제할까요?");
    if (!ok) return;

    try {
      await remove(ref(db, `reports/${id}`));
      setMessage("삭제되었습니다.");
    } catch (error) {
      console.error(error);
      setMessage("삭제 권한이 없습니다.");
    }
  };

  const handleToggleStatus = async (report: any) => {
    const nextStatus = report.status === "pending" ? "solved" : "pending";

    try {
      await update(ref(db, `reports/${report.id}`), {
        status: nextStatus,
      });
      setMessage(nextStatus === "solved" ? "해결됨으로 변경되었습니다." : "진행중으로 변경되었습니다.");
    } catch (error) {
      console.error(error);
      setMessage("상태 변경에 실패했습니다.");
    }
  };

  const handleClearAll = async () => {
    const ok = window.confirm("전체 데이터를 삭제할까요?");
    if (!ok) return;

    try {
      await remove(ref(db, "reports"));
      setMessage("전체 데이터가 초기화되었습니다.");
    } catch (error) {
      console.error(error);
      setMessage("관리자 권한이 필요합니다.");
    }
  };

  if (!nickname) {
    return (
      <div style={styles.joinScreen}>
        <style>{globalCss}</style>

        <div style={styles.joinWrap}>
          <div style={styles.brandHero}>
            <img src={logo} alt="logo" style={styles.logo} />

            <div style={styles.brandText}>
              <div style={styles.title}>FOUR SEASONS</div>
              <div style={styles.subtitle}>Run & Map Project 🍀</div>
            </div>
          </div>

          <div style={styles.joinCaption}>우리 지역의 사계절을 기록하고 함께 지켜나가요</div>

          <div style={styles.joinCard}>
            <div style={styles.joinCardTitle}>활동가 합류</div>
            <div style={styles.joinCardSub}>
              실시간 환경 지도 활동을 위해
              <br />
              닉네임을 입력해 주세요.
            </div>

            <form onSubmit={handleJoin}>
              <input
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                placeholder="닉네임 (예: 금정_철수)"
                style={styles.joinInput}
              />
              <input
                type="password"
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
                placeholder="관리자 코드 (관리자만 입력)"
                style={styles.joinInput}
              />
              <button type="submit" style={styles.joinButton}>
                지도 합류하기
                <span style={{ fontSize: 24, lineHeight: 0, opacity: 0.95 }}>›</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.appShell}>
      <style>{globalCss}</style>
      {message ? <div style={styles.toast}>{message}</div> : null}

      <Header nickname={nickname} isAdmin={isAdmin} onLogout={handleLogout} />

      <main style={styles.mainArea}>
        {activeTab === "map" && (
          <div style={styles.mapPage}>
            <div style={styles.fullMapWrap}>
              <MapContainer center={DEFAULT_CENTER} zoom={14} style={{ width: "100%", height: "100%" }}>
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <CurrentLocationMarker currentLocation={currentLocation} />
                <InitialMapFollow currentLocation={currentLocation} activeTab={activeTab} />

                {reports.map((report) => (
                  <Marker
                    key={report.id}
                    position={[report.location.lat, report.location.lng]}
                    icon={makeMarkerIcon(report.category)}
                  >
                    <Popup>
                      <div style={{ minWidth: 170 }}>
                        <div>
                          <strong>
                            {getCategory(report.category).icon} {getCategory(report.category).label}
                          </strong>
                        </div>
                        <div style={{ marginTop: 6, fontSize: 13 }}>지역: {report.area}</div>
                        <div style={{ fontSize: 13 }}>작성자: {report.userName}</div>
                        <div style={{ fontSize: 13 }}>상태: {report.status === "solved" ? "해결됨" : "진행중"}</div>
                        <div style={{ marginTop: 6, fontSize: 13 }}>{report.description}</div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>

            <button
              style={styles.recordFab}
              onClick={() => {
                resetForm();
                setShowAddSheet(true);
              }}
            >
              기록하기 +
            </button>
          </div>
        )}

        {activeTab === "list" && (
          <div style={styles.pageWrap}>
            <div style={styles.pageHeading}>ACTIVITY FEED</div>

            {reports.length === 0 ? (
              <div style={styles.emptyFeed}>아직 활동 기록이 없습니다.</div>
            ) : (
              reports.map((report) => {
                const cat = getCategory(report.category);
                const isOwner = !!user && report.uid === user.uid;

                const canDelete = isAdmin || isOwner;
                const canEdit = isAdmin || isOwner;

                const statusButtonStyle =
                  report.status === "solved" ? styles.statusSolved : styles.statusPending;

                const statusLabel = report.status === "solved" ? "해결됨 ✓" : "진행중";

                return (
                  <div key={report.id} style={styles.feedCard}>
                    <div style={styles.feedCardTop}>
                      <div style={styles.areaBadge}>
                        {cat.icon} {report.area}
                      </div>

                      <button
                        onClick={() => handleToggleStatus(report)}
                        style={statusButtonStyle}
                      >
                        {statusLabel}
                      </button>
                    </div>

                    {report.image ? <img src={report.image} alt="record" style={styles.feedImage} /> : null}

                    <div style={styles.feedText}>{report.description || "내용 없음"}</div>

                    <div style={styles.feedFooter}>
                      <div style={styles.feedUser}>👤 {report.userName}</div>

                      {canEdit || canDelete ? (
                        <div style={styles.feedActions}>
                          {canEdit ? (
                            <button onClick={() => handleStartEdit(report)} style={styles.editButton}>
                              수정
                            </button>
                          ) : null}

                          {canDelete ? (
                            <button onClick={() => handleDelete(report.id)} style={styles.deleteButton}>
                              삭제
                            </button>
                          ) : null}
                        </div>
                      ) : (
                        <div style={{ color: "#ccd4dd", fontSize: 11, fontWeight: 800 }}>읽기 전용</div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === "stats" && (
          <div style={styles.pageWrap}>
            <div style={styles.pageHeading}>ACTIVITY STATS</div>

            <div style={styles.totalBox}>
              <div style={styles.totalNumber}>{stats.total}</div>
              <div style={styles.totalLabel}>TOTAL TRASH FOUND</div>
            </div>

            <div style={styles.statRow}>
              <div style={styles.smallStatBox}>
                <div style={styles.smallStatTitle}>SOLVED</div>
                <div style={{ ...styles.smallStatNumber, color: GREEN }}>{stats.solved}</div>
              </div>

              <div style={styles.smallStatBox}>
                <div style={styles.smallStatTitle}>REMAINING</div>
                <div style={{ ...styles.smallStatNumber, color: NAVY }}>{stats.pending}</div>
              </div>
            </div>

            <div style={styles.categoryStatsWrap}>
              <div style={styles.categoryStatsTitle}>쓰레기 종류별 통계</div>
              <div style={styles.categoryStatsGrid}>
                {stats.categoryCounts.map((item) => (
                  <div key={item.id} style={styles.categoryStatCard}>
                    <div
                      style={{
                        ...styles.categoryStatIcon,
                        background: item.color,
                      }}
                    >
                      {item.icon}
                    </div>
                    <div style={styles.categoryStatLabel}>{item.label}</div>
                    <div style={styles.categoryStatCount}>{item.count}</div>
                  </div>
                ))}
              </div>
            </div>

            {isAdmin && (
              <div style={styles.adminCard}>
                <div style={styles.adminTitle}>⚠ ADMIN TOOLS</div>
                <div style={styles.adminDesc}>
                  모든 사용자의 피드를 삭제할 수 있으며, 전체 초기화도 가능합니다.
                  <br />
                  (삭제된 데이터는 복구가 불가합니다)
                </div>
                <button onClick={handleClearAll} style={styles.adminButton}>
                  데이터 전체 초기화
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {showAddSheet && (
        <div style={styles.sheetBackdrop}>
          <div style={styles.addSheet}>
            <div style={styles.sheetHeader}>
              <div style={styles.sheetTitle}>{editingReportId ? "RECORD EDIT" : "NEW RECORD"}</div>
              <button
                onClick={() => {
                  resetForm();
                  setShowAddSheet(false);
                }}
                style={styles.closeButton}
              >
                ✕
              </button>
            </div>

            <div style={styles.miniMapWrap}>
              <MapContainer center={DEFAULT_CENTER} zoom={14} style={{ width: "100%", height: "100%" }}>
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <ClickLocationPicker
                  selectedLocation={formData.location}
                  onChange={(loc) => {
                    setFormData((prev) => ({ ...prev, location: loc }));
                    setMiniMapTarget(loc);
                  }}
                />
                <CurrentLocationMarker currentLocation={currentLocation} />
                <RecenterMap targetLocation={miniMapTarget} zoom={17} />
              </MapContainer>
            </div>

            <div style={styles.helpCopy}>작은 지도에서 위치를 한 번 눌러 주세요.</div>

            <div style={styles.topActionGridThree}>
              <button type="button" onClick={handleCurrentLocation} style={styles.actionCardDark}>
                <div style={{ fontSize: 20 }}>📍</div>
                <div style={styles.actionCardLabelWhite}>내 위치 잡기</div>
              </button>

              <label style={styles.actionCardLight}>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageChange}
                  style={{ display: "none" }}
                />
                <div style={{ fontSize: 20, color: GREEN }}>📸</div>
                <div style={styles.actionCardLabelGreen}>사진 촬영</div>
              </label>

              <label style={styles.actionCardLight}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: "none" }}
                />
                <div style={{ fontSize: 20, color: GREEN }}>🖼️</div>
                <div style={styles.actionCardLabelGreen}>갤러리</div>
              </label>
            </div>

            {formData.image ? (
              <div style={styles.previewPanel}>
                <img src={formData.image} alt="preview" style={styles.previewPanelImage} />
                <button type="button" onClick={removeSelectedImage} style={styles.previewRemoveButton}>
                  사진 삭제
                </button>
              </div>
            ) : null}

            <select
              value={formData.area}
              onChange={(e) => setFormData((prev) => ({ ...prev, area: e.target.value }))}
              style={styles.selectBox}
            >
              {AREAS.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>

            <div style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, category: cat.id }))}
                  style={{
                    ...styles.categoryCard,
                    borderColor: formData.category === cat.id ? GREEN : "transparent",
                    boxShadow:
                      formData.category === cat.id
                        ? "inset 0 0 0 1px rgba(25,195,125,0.25)"
                        : "0 8px 18px rgba(0,0,0,0.04)",
                  }}
                >
                  <span style={{ fontSize: 20 }}>{cat.icon}</span>
                  <span style={styles.categoryCardText}>{cat.label}</span>
                </button>
              ))}
            </div>

            <textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="상황을 간단히 입력해 주세요."
              style={styles.textAreaBox}
            />

            <button
              onClick={handleSave}
              style={{
                ...styles.uploadButton,
                opacity: user ? 1 : 0.5,
                cursor: user ? "pointer" : "not-allowed",
              }}
              disabled={!user}
            >
              {user ? (editingReportId ? "수정 내용 저장" : "지도에 업로드") : "로그인 연결 중..."}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const globalCss = `
  html, body, #root {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    font-family: Arial, sans-serif;
    background: ${BG};
  }

  * { box-sizing: border-box; }
  button, input, textarea, select { font: inherit; }
  .leaflet-container { width: 100%; height: 100%; }

  @keyframes float {
    0% { transform: translateY(0px); }
    50% { transform: translateY(-6px); }
    100% { transform: translateY(0px); }
  }

  @keyframes pulseLocation {
    0% {
      transform: scale(0.7);
      opacity: 0.7;
    }
    100% {
      transform: scale(2.2);
      opacity: 0;
    }
  }

  @keyframes heroFadeUp {
    0% { opacity: 0; transform: translateY(10px); }
    100% { opacity: 1; transform: translateY(0); }
  }
`;

const styles: any = {
  appShell: {
    width: "100%",
    height: "100%",
    background: BG,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  joinScreen: {
    width: "100%",
    height: "100%",
    background: "linear-gradient(180deg, #edf8f1 0%, #e6f6ee 100%)",
    overflowY: "auto",
  },
  joinWrap: {
    minHeight: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 16px 36px",
    animation: "heroFadeUp 0.6s ease",
  },
  brandHero: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    marginBottom: 12,
    flexWrap: "nowrap",
  },
  logo: {
    width: 96,
    height: 96,
    objectFit: "contain",
    animation: "float 3s ease-in-out infinite",
    filter: "drop-shadow(0 10px 18px rgba(0,0,0,0.10))",
    flexShrink: 0,
  },
  brandText: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "center",
  },
  title: {
    fontSize: 34,
    fontWeight: 900,
    color: NAVY,
    letterSpacing: "-0.04em",
    lineHeight: 1,
    whiteSpace: "nowrap",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: 800,
    color: "#1fb874",
  },
  joinCaption: {
    marginTop: 20,
    background: "rgba(255,255,255,0.9)",
    color: "#1fa574",
    fontSize: 14,
    fontWeight: 800,
    borderRadius: 999,
    padding: "12px 18px",
    boxShadow: "0 6px 18px rgba(0,0,0,0.04)",
    border: `1px solid ${BORDER}`,
    textAlign: "center",
    letterSpacing: "-0.02em",
    whiteSpace: "nowrap",
  },
  joinCard: {
    width: "100%",
    maxWidth: 640,
    background: "rgba(255,255,255,0.96)",
    backdropFilter: "blur(8px)",
    borderRadius: 34,
    marginTop: 28,
    padding: "32px 24px 24px",
    boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
    border: `1px solid ${BORDER}`,
  },
  joinCardTitle: {
    textAlign: "center",
    color: NAVY,
    fontWeight: 900,
    fontSize: 28,
    letterSpacing: "-0.04em",
  },
  joinCardSub: {
    textAlign: "center",
    color: LIGHT_TEXT,
    lineHeight: 1.6,
    fontSize: 14,
    fontWeight: 700,
    marginTop: 10,
    marginBottom: 22,
  },
  joinInput: {
    width: "100%",
    background: "#f7faf8",
    border: "1px solid #e8edf3",
    borderRadius: 22,
    padding: "18px 14px",
    fontSize: 15,
    fontWeight: 800,
    color: "#55606e",
    outline: "none",
    textAlign: "center",
    marginBottom: 14,
  },
  joinButton: {
    width: "100%",
    border: "none",
    borderRadius: 24,
    padding: "20px 18px",
    background: "linear-gradient(135deg, #19c37d 0%, #2dd4a3 100%)",
    color: "white",
    fontWeight: 900,
    fontSize: 22,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    boxShadow: "0 12px 24px rgba(25,195,125,0.22)",
    cursor: "pointer",
  },
  headerBar: {
    height: 72,
    background: "white",
    borderBottom: `1px solid ${BORDER}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 14px",
    flexShrink: 0,
  },
  adminPill: {
    minWidth: 80,
    height: 38,
    borderRadius: 999,
    border: `1px solid ${BORDER}`,
    color: "#1d8f63",
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f4fbf7",
    fontSize: 14,
  },
  userPill: {
    minWidth: 80,
    height: 38,
    borderRadius: 999,
    border: `1px solid ${BORDER}`,
    color: "#1d8f63",
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f4fbf7",
    padding: "0 12px",
    fontSize: 13,
  },
  logoutButton: {
    width: 30,
    height: 30,
    border: "none",
    background: "transparent",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  mainArea: {
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
    position: "relative",
  },
  mapPage: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  fullMapWrap: {
    position: "absolute",
    inset: 0,
  },
  recordFab: {
    position: "absolute",
    left: "50%",
    bottom: 86,
    transform: "translateX(-50%)",
    border: "none",
    background: NAVY,
    color: "white",
    fontSize: 17,
    fontWeight: 900,
    padding: "18px 32px",
    borderRadius: 999,
    boxShadow: "0 14px 28px rgba(22,37,68,0.22)",
    cursor: "pointer",
    zIndex: 500,
  },
  pageWrap: {
    width: "100%",
    height: "100%",
    overflowY: "auto",
    padding: "20px 16px 108px",
    background: BG,
  },
  pageHeading: {
    color: NAVY,
    fontWeight: 900,
    fontSize: 28,
    letterSpacing: "-0.03em",
    marginBottom: 20,
  },
  emptyFeed: {
    color: "#c8d0db",
    textAlign: "center",
    marginTop: 150,
    fontWeight: 900,
    fontSize: 22,
  },
  feedCard: {
    background: "white",
    borderRadius: 28,
    padding: 18,
    marginBottom: 14,
    border: `1px solid ${BORDER}`,
    boxShadow: "0 8px 18px rgba(0,0,0,0.05)",
  },
  feedCardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  areaBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: 11,
    fontWeight: 900,
    color: GREEN,
    padding: "7px 10px",
    background: "#f4fbf7",
    borderRadius: 999,
    border: `1px solid ${BORDER}`,
  },
  statusSolved: {
    border: "none",
    background: GREEN,
    color: "white",
    fontWeight: 900,
    fontSize: 10,
    padding: "7px 10px",
    borderRadius: 999,
    cursor: "pointer",
  },
  statusPending: {
    border: "none",
    background: "#eef2f7",
    color: "#9ea7b4",
    fontWeight: 900,
    fontSize: 10,
    padding: "7px 10px",
    borderRadius: 999,
    cursor: "pointer",
  },
  feedImage: {
    width: "100%",
    height: 170,
    objectFit: "cover",
    borderRadius: 20,
    marginBottom: 12,
    border: "1px solid #edf2f5",
  },
  feedText: {
    color: "#5c6674",
    fontSize: 15,
    lineHeight: 1.55,
    fontWeight: 700,
    marginBottom: 14,
    padding: "0 2px",
  },
  feedFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderTop: "1px solid #eff3f7",
    paddingTop: 12,
  },
  feedUser: {
    color: "#9aa3af",
    fontWeight: 800,
    fontSize: 12,
  },
  feedActions: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  editButton: {
    border: "none",
    background: "transparent",
    color: "#4aa97f",
    fontWeight: 900,
    fontSize: 13,
    cursor: "pointer",
  },
  deleteButton: {
    border: "none",
    background: "transparent",
    color: "#ef9a9a",
    fontWeight: 900,
    fontSize: 13,
    cursor: "pointer",
  },
  totalBox: {
    background: NAVY,
    borderRadius: 40,
    padding: "34px 16px 24px",
    textAlign: "center",
    boxShadow: "0 14px 28px rgba(22,37,68,0.18)",
    marginBottom: 18,
  },
  totalNumber: {
    color: "white",
    fontWeight: 900,
    fontSize: 72,
    lineHeight: 1,
    marginBottom: 8,
  },
  totalLabel: {
    color: GREEN,
    fontWeight: 900,
    letterSpacing: "0.12em",
    fontSize: 13,
  },
  statRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
    marginBottom: 20,
  },
  smallStatBox: {
    background: "white",
    borderRadius: 26,
    padding: "24px 14px",
    textAlign: "center",
    boxShadow: "0 8px 18px rgba(0,0,0,0.05)",
  },
  smallStatTitle: {
    color: "#9ca6b5",
    fontSize: 12,
    fontWeight: 900,
    marginBottom: 14,
  },
  smallStatNumber: {
    fontSize: 42,
    fontWeight: 900,
    lineHeight: 1,
  },
  categoryStatsWrap: {
    background: "white",
    borderRadius: 28,
    padding: "20px 16px",
    boxShadow: "0 8px 18px rgba(0,0,0,0.05)",
    marginBottom: 20,
  },
  categoryStatsTitle: {
    color: NAVY,
    fontWeight: 900,
    fontSize: 18,
    marginBottom: 14,
  },
  categoryStatsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  categoryStatCard: {
    background: "#f8fbf9",
    border: `1px solid ${BORDER}`,
    borderRadius: 20,
    padding: "14px 12px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    minHeight: 116,
    justifyContent: "center",
  },
  categoryStatIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
    marginBottom: 10,
    boxShadow: "0 8px 16px rgba(0,0,0,0.10)",
  },
  categoryStatLabel: {
    color: NAVY,
    fontSize: 12,
    fontWeight: 800,
    marginBottom: 6,
    lineHeight: 1.35,
  },
  categoryStatCount: {
    color: GREEN,
    fontSize: 24,
    fontWeight: 900,
    lineHeight: 1,
  },
  adminCard: {
    background: "#f9fcfa",
    borderRadius: 32,
    border: "2px dashed #f3dddd",
    padding: "30px 18px 22px",
    textAlign: "center",
    boxShadow: "0 8px 18px rgba(0,0,0,0.03)",
  },
  adminTitle: {
    color: "#f08a8a",
    fontWeight: 900,
    fontSize: 24,
    marginBottom: 12,
  },
  adminDesc: {
    color: "#bac2cb",
    fontWeight: 800,
    lineHeight: 1.45,
    fontSize: 13,
    marginBottom: 18,
  },
  adminButton: {
    width: "100%",
    border: "none",
    background: "#ea8f8f",
    color: "white",
    fontWeight: 900,
    fontSize: 18,
    borderRadius: 22,
    padding: "18px 16px",
    cursor: "pointer",
  },
  bottomNav: {
    height: 82,
    background: "white",
    borderTop: `1px solid ${BORDER}`,
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    alignItems: "center",
    flexShrink: 0,
    paddingBottom: 4,
  },
  navItemButton: {
    border: "none",
    background: "transparent",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    cursor: "pointer",
  },
  navLabel: {
    fontSize: 12,
    fontWeight: 900,
  },
  sheetBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(10,18,32,0.18)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    zIndex: 2000,
  },
  addSheet: {
    width: "100%",
    maxWidth: 800,
    maxHeight: "88vh",
    overflowY: "auto",
    background: BG,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: "18px 14px 22px",
    boxShadow: "0 -14px 36px rgba(0,0,0,0.16)",
  },
  sheetHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sheetTitle: {
    color: NAVY,
    fontWeight: 900,
    fontSize: 20,
    letterSpacing: "-0.03em",
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    border: "1px solid #eef3f0",
    background: "white",
    fontSize: 18,
    cursor: "pointer",
  },
  miniMapWrap: {
    height: 190,
    overflow: "hidden",
    borderRadius: 20,
    marginBottom: 8,
    boxShadow: "0 8px 18px rgba(0,0,0,0.06)",
  },
  helpCopy: {
    color: "#8f9caa",
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 12,
    textAlign: "center",
  },
  topActionGridThree: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 10,
    marginBottom: 12,
  },
  actionCardDark: {
    height: 84,
    border: "none",
    borderRadius: 22,
    background: NAVY,
    color: "white",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    boxShadow: "0 8px 18px rgba(22,37,68,0.18)",
    cursor: "pointer",
  },
  actionCardLight: {
    height: 84,
    borderRadius: 22,
    background: "white",
    border: `2px dashed ${BORDER}`,
    color: GREEN,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    boxShadow: "0 8px 16px rgba(0,0,0,0.04)",
    cursor: "pointer",
    overflow: "hidden",
    position: "relative",
  },
  actionCardLabelWhite: {
    fontSize: 11,
    fontWeight: 900,
    color: "white",
    textAlign: "center",
  },
  actionCardLabelGreen: {
    fontSize: 11,
    fontWeight: 900,
    color: GREEN,
    textAlign: "center",
  },
  previewPanel: {
    background: "white",
    borderRadius: 20,
    padding: 10,
    marginBottom: 12,
    boxShadow: "0 8px 16px rgba(0,0,0,0.04)",
  },
  previewPanelImage: {
    width: "100%",
    height: 180,
    objectFit: "cover",
    borderRadius: 16,
    marginBottom: 10,
  },
  previewRemoveButton: {
    width: "100%",
    border: "none",
    background: "#f3f5f7",
    color: "#6b7280",
    fontWeight: 900,
    fontSize: 13,
    borderRadius: 14,
    padding: "12px 14px",
    cursor: "pointer",
  },
  selectBox: {
    width: "100%",
    border: "2px solid #edf2f0",
    background: "white",
    borderRadius: 18,
    padding: "14px 14px",
    fontSize: 15,
    fontWeight: 800,
    color: NAVY,
    marginBottom: 12,
    outline: "none",
  },
  categoryGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    marginBottom: 12,
  },
  categoryCard: {
    border: "2px solid transparent",
    background: "white",
    borderRadius: 20,
    minHeight: 68,
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "0 14px",
    cursor: "pointer",
  },
  categoryCardText: {
    color: NAVY,
    fontSize: 12,
    fontWeight: 900,
  },
  textAreaBox: {
    width: "100%",
    minHeight: 120,
    borderRadius: 24,
    border: "2px solid #eef2f0",
    background: "white",
    padding: "16px 14px",
    fontSize: 15,
    color: NAVY,
    resize: "none",
    outline: "none",
    marginBottom: 14,
  },
  uploadButton: {
    width: "100%",
    border: "none",
    background: GREEN,
    color: "white",
    fontWeight: 900,
    fontSize: 18,
    borderRadius: 24,
    padding: "20px 16px",
    cursor: "pointer",
    boxShadow: "0 14px 24px rgba(25,195,125,0.20)",
  },
  toast: {
    position: "fixed",
    top: 14,
    left: "50%",
    transform: "translateX(-50%)",
    background: "#182742",
    color: "white",
    padding: "10px 18px",
    borderRadius: 14,
    zIndex: 4000,
    boxShadow: "0 12px 24px rgba(0,0,0,0.18)",
    fontWeight: 800,
    fontSize: 14,
    whiteSpace: "nowrap",
    maxWidth: "90vw",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
};