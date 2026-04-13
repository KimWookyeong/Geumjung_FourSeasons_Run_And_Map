// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";
import {
  onAuthStateChanged,
  signInAnonymously,
  signOut,
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "./firebase";

const BG = "#edf8f1";
const GREEN = "#19c37d";
const NAVY = "#162544";
const BORDER = "#d7eee1";
const LIGHT_TEXT = "#9aa7b6";

const NAME_KEY = "four_seasons_run_map_name_v2";
const DEFAULT_CENTER = [35.243, 129.092];

// 관리자 UID를 여기에 넣으면 관리자 기능이 열립니다.
const ADMIN_UIDS = [
  "PUT_ADMIN_UID_HERE"
];

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
  { id: "plastic", label: "플라스틱/비닐", icon: "🛍️", color: "#3b82f6" },
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
        width:36px;
        height:36px;
        border-radius:12px;
        background:${cat.color};
        color:white;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:18px;
        border:3px solid white;
        transform:rotate(45deg);
        box-shadow:0 8px 18px rgba(0,0,0,0.18);
      ">
        <div style="transform:rotate(-45deg)">${cat.icon}</div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}

function makePickerIcon() {
  return L.divIcon({
    className: "trash-map-picker",
    html: `
      <div style="
        width:22px;
        height:22px;
        border-radius:50%;
        background:#ef4444;
        border:3px solid white;
        box-shadow:0 2px 8px rgba(0,0,0,0.25);
      "></div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function ShieldLogo() {
  return (
    <div
      style={{
        width: 42,
        height: 42,
        borderRadius: 12,
        background: GREEN,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 14px rgba(25,195,125,0.25)",
      }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
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

function CloverLogo({ size = 98 }: { size?: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "8px 0 10px" }}>
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <g transform="translate(50,50)">
          {[0, 90, 180, 270].map((angle) => (
            <path
              key={angle}
              d="M0 0C-16 -24 -34 -14 -34 0C-34 14 -16 24 0 0ZM0 0C16 -24 34 -14 34 0C34 14 16 24 0 0Z"
              fill={GREEN}
              stroke="#0d5d45"
              strokeWidth="2"
              transform={`rotate(${angle})`}
            />
          ))}
        </g>
        <circle cx="50" cy="50" r="8" fill="white" opacity="0.45" />
      </svg>
    </div>
  );
}

function MapNavIcon({ active }: { active: boolean }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
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
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
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
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
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
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <ShieldLogo />
        <div style={{ fontSize: 23, fontWeight: 900, color: NAVY, letterSpacing: "-0.02em" }}>
          FOUR SEASONS
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {isAdmin ? <div style={styles.adminPill}>Admin</div> : <div style={styles.userPill}>{nickname}</div>}
        <button onClick={onLogout} style={styles.logoutButton} aria-label="로그아웃">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
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

export default function TrashMap() {
  const [nickname, setNickname] = useState("");
  const [nicknameInput, setNicknameInput] = useState("");
  const [user, setUser] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("map");
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [message, setMessage] = useState("");

  const [formData, setFormData] = useState({
    category: "cup",
    area: AREAS[0],
    description: "",
    image: "",
    location: null as { lat: number; lng: number } | null,
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setNickname(localStorage.getItem(NAME_KEY) || "");
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        try {
          await signInAnonymously(auth);
        } catch (error) {
          console.error(error);
          setMessage("Firebase 인증에 실패했습니다.");
        }
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "reports"), orderBy("createdAtMs", "desc"));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
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
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 2600);
    return () => clearTimeout(timer);
  }, [message]);

  const isAdmin = !!user && ADMIN_UIDS.includes(user.uid);

  const stats = useMemo(() => {
    const solved = reports.filter((r) => r.status === "solved").length;
    const pending = reports.length - solved;
    return { total: reports.length, solved, pending };
  }, [reports]);

  const resetForm = () => {
    setFormData({
      category: "cup",
      area: AREAS[0],
      description: "",
      image: "",
      location: null,
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeSelectedImage = () => {
    setFormData((prev) => ({ ...prev, image: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
    setMessage("사진이 삭제되었습니다.");
  };

  const handleJoin = (e: any) => {
    e.preventDefault();
    const value = nicknameInput.trim();
    if (!value) {
      setMessage("닉네임을 입력해 주세요.");
      return;
    }
    localStorage.setItem(NAME_KEY, value);
    setNickname(value);
    setMessage("입장 완료");
  };

  const handleLogout = async () => {
    localStorage.removeItem(NAME_KEY);
    setNickname("");
    setNicknameInput("");
    setShowAddSheet(false);
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
        setFormData((prev) => ({
          ...prev,
          location: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          },
        }));
        setMessage("현재 위치를 불러왔습니다.");
      },
      () => {
        setMessage("위치 권한을 허용해 주세요.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleImageChange = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage("이미지 파일만 올릴 수 있습니다.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({ ...prev, image: reader.result as string }));
      setMessage("사진이 첨부되었습니다.");
    };
    reader.readAsDataURL(file);
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

    const baseReport = {
      uid: user.uid,
      userName: nickname,
      category: formData.category,
      area: formData.area,
      description: formData.description.trim() || "내용 없음",
      image: formData.image || "",
      location: formData.location,
      status: "pending",
      createdAt: serverTimestamp(),
      createdAtMs: Date.now(),
    };

    try {
      await addDoc(collection(db, "reports"), baseReport);
      resetForm();
      setShowAddSheet(false);
      setActiveTab("list");
      setMessage("저장되었습니다.");
    } catch (error) {
      console.error(error);

      if (formData.image) {
        try {
          await addDoc(collection(db, "reports"), {
            ...baseReport,
            image: "",
          });
          resetForm();
          setShowAddSheet(false);
          setActiveTab("list");
          setMessage("사진을 제외하고 저장되었습니다.");
          return;
        } catch (retryError) {
          console.error(retryError);
        }
      }

      setMessage("저장에 실패했습니다. Firebase 설정과 규칙을 확인해 주세요.");
    }
  };

  const handleDelete = async (id: string) => {
    const ok = window.confirm("이 기록을 삭제할까요?");
    if (!ok) return;

    try {
      await deleteDoc(doc(db, "reports", id));
      setMessage("삭제되었습니다.");
    } catch (error) {
      console.error(error);
      setMessage("삭제 권한이 없습니다.");
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    try {
      await updateDoc(doc(db, "reports", id), {
        status: currentStatus === "pending" ? "solved" : "pending",
      });
    } catch (error) {
      console.error(error);
      setMessage("상태 변경 권한이 없습니다.");
    }
  };

  const handleClearAll = async () => {
    const ok = window.confirm("전체 데이터를 삭제할까요?");
    if (!ok) return;

    try {
      const snapshot = await getDocs(collection(db, "reports"));
      const batch = writeBatch(db);
      snapshot.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      setMessage("전체 데이터가 삭제되었습니다.");
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
          <CloverLogo size={102} />
          <div style={styles.joinTitle}>FOUR SEASONS</div>
          <div style={styles.joinCaption}>금정구의 사계절을 기록하고 함께 지켜나가요</div>

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
              <button type="submit" style={styles.joinButton}>
                지도 합류하기
                <span style={{ fontSize: 28, lineHeight: 0, opacity: 0.95 }}>›</span>
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

                {reports.map((report) => (
                  <Marker
                    key={report.id}
                    position={[report.location.lat, report.location.lng]}
                    icon={makeMarkerIcon(report.category)}
                  >
                    <Popup>
                      <div style={{ minWidth: 180 }}>
                        <div>
                          <strong>
                            {getCategory(report.category).icon} {getCategory(report.category).label}
                          </strong>
                        </div>
                        <div style={{ marginTop: 6 }}>지역: {report.area}</div>
                        <div>작성자: {report.userName}</div>
                        <div>상태: {report.status === "solved" ? "해결됨" : "진행중"}</div>
                        <div style={{ marginTop: 6 }}>{report.description}</div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>

            <button style={styles.recordFab} onClick={() => setShowAddSheet(true)}>
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
                const canDelete = isAdmin || (user && report.uid === user.uid);
                const canToggle = isAdmin || (user && report.uid === user.uid);

                return (
                  <div key={report.id} style={styles.feedCard}>
                    <div style={styles.feedCardTop}>
                      <div style={styles.areaBadge}>
                        {cat.icon} {report.area}
                      </div>

                      <button
                        onClick={() => canToggle && handleToggleStatus(report.id, report.status)}
                        style={report.status === "solved" ? styles.statusSolved : styles.statusPending}
                      >
                        {report.status === "solved" ? "해결됨 ✓" : "진행중"}
                      </button>
                    </div>

                    {report.image ? <img src={report.image} alt="record" style={styles.feedImage} /> : null}

                    <div style={styles.feedText}>{report.description || "내용 없음"}</div>

                    <div style={styles.feedFooter}>
                      <div style={styles.feedUser}>👤 {report.userName}</div>
                      {canDelete ? (
                        <button onClick={() => handleDelete(report.id)} style={styles.deleteButton}>
                          삭제
                        </button>
                      ) : (
                        <div style={{ color: "#ccd4dd", fontSize: 12, fontWeight: 800 }}>읽기 전용</div>
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

            <div style={styles.uidCard}>
              <div style={styles.uidTitle}>내 UID</div>
              <div style={styles.uidValue}>{user?.uid || "연결 중..."}</div>
              <button
                onClick={() => {
                  if (user?.uid) {
                    navigator.clipboard.writeText(user.uid);
                    setMessage("UID가 복사되었습니다.");
                  }
                }}
                style={styles.uidCopyButton}
              >
                UID 복사
              </button>
            </div>

            {isAdmin && (
              <div style={styles.adminCard}>
                <div style={styles.adminTitle}>⚠ ADMIN TOOLS</div>
                <div style={styles.adminDesc}>
                  전체 활동 데이터를 즉시 삭제할 수 있습니다.
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
              <div style={styles.sheetTitle}>NEW RECORD</div>
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
                  onChange={(loc) => setFormData((prev) => ({ ...prev, location: loc }))}
                />
              </MapContainer>
            </div>

            <div style={styles.helpCopy}>작은 지도에서 위치를 한 번 눌러 주세요.</div>

            <div style={styles.topActionGrid}>
              <button type="button" onClick={handleCurrentLocation} style={styles.actionCardDark}>
                <div style={{ fontSize: 24 }}>📍</div>
                <div style={styles.actionCardLabelWhite}>내 위치 잡기</div>
              </button>

              <label style={styles.actionCardLight}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: "none" }}
                />

                {formData.image ? (
                  <div style={styles.previewWrap}>
                    <img src={formData.image} alt="preview" style={styles.uploadPreview} />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeSelectedImage();
                      }}
                      style={styles.removeImageButton}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 24, color: GREEN }}>📷</div>
                    <div style={styles.actionCardLabelGreen}>사진 업로드</div>
                  </>
                )}
              </label>
            </div>

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
                        : "0 8px 20px rgba(0,0,0,0.04)",
                  }}
                >
                  <span style={{ fontSize: 22 }}>{cat.icon}</span>
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

            <button onClick={handleSave} style={styles.uploadButton}>
              지도에 업로드
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
    background: BG,
    overflowY: "auto",
  },
  joinWrap: {
    minHeight: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "34px 20px 48px",
  },
  joinTitle: {
    fontSize: 42,
    fontWeight: 900,
    color: NAVY,
    letterSpacing: "-0.04em",
    marginTop: 4,
  },
  joinCaption: {
    marginTop: 16,
    background: "white",
    color: "#1fa574",
    fontSize: 12,
    fontWeight: 800,
    borderRadius: 999,
    padding: "10px 18px",
    boxShadow: "0 4px 18px rgba(0,0,0,0.05)",
    border: `1px solid ${BORDER}`,
    textAlign: "center",
    whiteSpace: "nowrap",
    letterSpacing: "-0.02em",
  },
  joinCard: {
    width: "100%",
    maxWidth: 690,
    background: "white",
    borderRadius: 42,
    marginTop: 44,
    padding: "48px 36px 34px",
    boxShadow: "0 24px 44px rgba(0,0,0,0.10)",
    border: `1px solid ${BORDER}`,
  },
  joinCardTitle: {
    textAlign: "center",
    color: NAVY,
    fontWeight: 900,
    fontSize: 34,
    letterSpacing: "-0.04em",
  },
  joinCardSub: {
    textAlign: "center",
    color: LIGHT_TEXT,
    lineHeight: 1.6,
    fontSize: 16,
    fontWeight: 700,
    marginTop: 14,
    marginBottom: 30,
  },
  joinInput: {
    width: "100%",
    background: "#f3f5f8",
    border: "1px solid #e8edf3",
    borderRadius: 28,
    padding: "28px 24px",
    fontSize: 22,
    fontWeight: 800,
    color: "#9ca4b0",
    outline: "none",
    textAlign: "center",
    marginBottom: 26,
  },
  joinButton: {
    width: "100%",
    border: "none",
    borderRadius: 30,
    padding: "26px 24px",
    background: GREEN,
    color: "white",
    fontWeight: 900,
    fontSize: 28,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
    boxShadow: "0 14px 28px rgba(25,195,125,0.24)",
    cursor: "pointer",
  },
  headerBar: {
    height: 86,
    background: "white",
    borderBottom: `1px solid ${BORDER}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 18px",
    flexShrink: 0,
  },
  adminPill: {
    minWidth: 94,
    height: 46,
    borderRadius: 999,
    border: `1px solid ${BORDER}`,
    color: "#1d8f63",
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f4fbf7",
    fontSize: 16,
  },
  userPill: {
    minWidth: 94,
    height: 46,
    borderRadius: 999,
    border: `1px solid ${BORDER}`,
    color: "#1d8f63",
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f4fbf7",
    padding: "0 14px",
    fontSize: 14,
  },
  logoutButton: {
    width: 34,
    height: 34,
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
    bottom: 98,
    transform: "translateX(-50%)",
    border: "none",
    background: NAVY,
    color: "white",
    fontSize: 20,
    fontWeight: 900,
    padding: "22px 42px",
    borderRadius: 999,
    boxShadow: "0 18px 32px rgba(22,37,68,0.25)",
    cursor: "pointer",
    zIndex: 500,
  },
  pageWrap: {
    width: "100%",
    height: "100%",
    overflowY: "auto",
    padding: "28px 22px 120px",
    background: BG,
  },
  pageHeading: {
    color: NAVY,
    fontWeight: 900,
    fontSize: 34,
    letterSpacing: "-0.03em",
    marginBottom: 28,
  },
  emptyFeed: {
    color: "#c8d0db",
    textAlign: "center",
    marginTop: 180,
    fontWeight: 900,
    fontSize: 26,
  },
  feedCard: {
    background: "white",
    borderRadius: 38,
    padding: 24,
    marginBottom: 18,
    border: `1px solid ${BORDER}`,
    boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
  },
  feedCardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  areaBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: 12,
    fontWeight: 900,
    color: GREEN,
    padding: "8px 12px",
    background: "#f4fbf7",
    borderRadius: 999,
    border: `1px solid ${BORDER}`,
  },
  statusSolved: {
    border: "none",
    background: GREEN,
    color: "white",
    fontWeight: 900,
    fontSize: 11,
    padding: "8px 12px",
    borderRadius: 999,
    cursor: "pointer",
  },
  statusPending: {
    border: "none",
    background: "#eef2f7",
    color: "#9ea7b4",
    fontWeight: 900,
    fontSize: 11,
    padding: "8px 12px",
    borderRadius: 999,
    cursor: "pointer",
  },
  feedImage: {
    width: "100%",
    height: 192,
    objectFit: "cover",
    borderRadius: 28,
    marginBottom: 16,
    border: "1px solid #edf2f5",
  },
  feedText: {
    color: "#5c6674",
    fontSize: 18,
    lineHeight: 1.6,
    fontWeight: 700,
    marginBottom: 18,
    padding: "0 4px",
  },
  feedFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderTop: "1px solid #eff3f7",
    paddingTop: 14,
  },
  feedUser: {
    color: "#9aa3af",
    fontWeight: 800,
    fontSize: 13,
  },
  deleteButton: {
    border: "none",
    background: "transparent",
    color: "#ef9a9a",
    fontWeight: 900,
    fontSize: 14,
    cursor: "pointer",
  },
  totalBox: {
    background: NAVY,
    borderRadius: 56,
    padding: "46px 20px 34px",
    textAlign: "center",
    boxShadow: "0 18px 34px rgba(22,37,68,0.18)",
    marginBottom: 20,
  },
  totalNumber: {
    color: "white",
    fontWeight: 900,
    fontSize: 92,
    lineHeight: 1,
    marginBottom: 10,
  },
  totalLabel: {
    color: GREEN,
    fontWeight: 900,
    letterSpacing: "0.12em",
    fontSize: 16,
  },
  statRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 18,
    marginBottom: 24,
  },
  smallStatBox: {
    background: "white",
    borderRadius: 34,
    padding: "34px 20px",
    textAlign: "center",
    boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
  },
  smallStatTitle: {
    color: "#9ca6b5",
    fontSize: 14,
    fontWeight: 900,
    marginBottom: 18,
  },
  smallStatNumber: {
    fontSize: 54,
    fontWeight: 900,
    lineHeight: 1,
  },
  uidCard: {
    background: "white",
    borderRadius: 28,
    padding: "24px 20px",
    marginBottom: 24,
    boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
  },
  uidTitle: {
    color: NAVY,
    fontWeight: 900,
    fontSize: 18,
    marginBottom: 10,
  },
  uidValue: {
    color: "#5c6674",
    fontSize: 12,
    fontWeight: 700,
    wordBreak: "break-all",
    lineHeight: 1.6,
    background: "#f7faf8",
    borderRadius: 12,
    padding: "10px 12px",
    marginBottom: 12,
  },
  uidCopyButton: {
    border: "none",
    background: NAVY,
    color: "white",
    borderRadius: 14,
    padding: "10px 14px",
    fontWeight: 800,
    cursor: "pointer",
  },
  adminCard: {
    background: "#f9fcfa",
    borderRadius: 42,
    border: "2px dashed #f3dddd",
    padding: "42px 24px 28px",
    textAlign: "center",
    boxShadow: "0 8px 20px rgba(0,0,0,0.03)",
  },
  adminTitle: {
    color: "#f08a8a",
    fontWeight: 900,
    fontSize: 28,
    marginBottom: 16,
  },
  adminDesc: {
    color: "#bac2cb",
    fontWeight: 800,
    lineHeight: 1.4,
    fontSize: 14,
    marginBottom: 24,
  },
  adminButton: {
    width: "100%",
    border: "none",
    background: "#ea8f8f",
    color: "white",
    fontWeight: 900,
    fontSize: 20,
    borderRadius: 28,
    padding: "22px 20px",
    cursor: "pointer",
  },
  bottomNav: {
    height: 92,
    background: "white",
    borderTop: `1px solid ${BORDER}`,
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    alignItems: "center",
    flexShrink: 0,
    paddingBottom: 6,
  },
  navItemButton: {
    border: "none",
    background: "transparent",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    cursor: "pointer",
  },
  navLabel: {
    fontSize: 14,
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
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    padding: "22px 18px 28px",
    boxShadow: "0 -14px 36px rgba(0,0,0,0.16)",
  },
  sheetHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  sheetTitle: {
    color: NAVY,
    fontWeight: 900,
    fontSize: 24,
    letterSpacing: "-0.03em",
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    border: "1px solid #eef3f0",
    background: "white",
    fontSize: 20,
    cursor: "pointer",
  },
  miniMapWrap: {
    height: 220,
    overflow: "hidden",
    borderRadius: 24,
    marginBottom: 10,
    boxShadow: "0 10px 20px rgba(0,0,0,0.06)",
  },
  helpCopy: {
    color: "#8f9caa",
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 14,
    textAlign: "center",
  },
  topActionGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
    marginBottom: 14,
  },
  actionCardDark: {
    height: 96,
    border: "none",
    borderRadius: 28,
    background: NAVY,
    color: "white",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    boxShadow: "0 10px 22px rgba(22,37,68,0.18)",
    cursor: "pointer",
  },
  actionCardLight: {
    height: 96,
    borderRadius: 28,
    background: "white",
    border: `2px dashed ${BORDER}`,
    color: GREEN,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    boxShadow: "0 8px 16px rgba(0,0,0,0.04)",
    cursor: "pointer",
    overflow: "hidden",
    position: "relative",
  },
  actionCardLabelWhite: {
    fontSize: 12,
    fontWeight: 900,
    color: "white",
  },
  actionCardLabelGreen: {
    fontSize: 12,
    fontWeight: 900,
    color: GREEN,
  },
  previewWrap: {
    position: "relative",
    width: "100%",
    height: "100%",
  },
  uploadPreview: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  removeImageButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: "50%",
    border: "none",
    background: "rgba(0,0,0,0.72)",
    color: "white",
    fontWeight: 900,
    fontSize: 16,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 10px rgba(0,0,0,0.18)",
  },
  selectBox: {
    width: "100%",
    border: "2px solid #edf2f0",
    background: "white",
    borderRadius: 20,
    padding: "16px 16px",
    fontSize: 16,
    fontWeight: 800,
    color: NAVY,
    marginBottom: 14,
    outline: "none",
  },
  categoryGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginBottom: 14,
  },
  categoryCard: {
    border: "2px solid transparent",
    background: "white",
    borderRadius: 24,
    minHeight: 78,
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "0 16px",
    cursor: "pointer",
  },
  categoryCardText: {
    color: NAVY,
    fontSize: 13,
    fontWeight: 900,
  },
  textAreaBox: {
    width: "100%",
    minHeight: 138,
    borderRadius: 30,
    border: "2px solid #eef2f0",
    background: "white",
    padding: "20px 18px",
    fontSize: 16,
    color: NAVY,
    resize: "none",
    outline: "none",
    marginBottom: 18,
  },
  uploadButton: {
    width: "100%",
    border: "none",
    background: GREEN,
    color: "white",
    fontWeight: 900,
    fontSize: 20,
    borderRadius: 30,
    padding: "24px 18px",
    cursor: "pointer",
    boxShadow: "0 16px 28px rgba(25,195,125,0.20)",
  },
  toast: {
    position: "fixed",
    top: 14,
    left: "50%",
    transform: "translateX(-50%)",
    background: "#182742",
    color: "white",
    padding: "12px 16px",
    borderRadius: 16,
    zIndex: 4000,
    boxShadow: "0 12px 24px rgba(0,0,0,0.18)",
    fontWeight: 800,
  },
};