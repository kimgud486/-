import React, { useState, useEffect } from "react";
import { 
  Lock, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  X, 
  ExternalLink,
  Activity,
  ShieldAlert,
  Building2,
  Zap,
  HelpCircle
} from "lucide-react";
import { useApp } from "../../context/AppContext";

interface BrokerApiConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BrokerApiConnectModal: React.FC<BrokerApiConnectModalProps> = ({
  isOpen,
  onClose
}) => {
  const { 
    profile, 
    updateProfileSettings, 
    addToast, 
    syncRealAccountBalance,
    brokerApiError,
    clearBrokerError
  } = useApp();

  const [showSecret, setShowSecret] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; balance?: string } | null>(null);

  // Korea Investment State
  const [koreaKey, setKoreaKey] = useState(profile?.koreaAppKey || "");
  const [koreaSecret, setKoreaSecret] = useState(profile?.koreaAppSecret || "");
  const [koreaAccountNo, setKoreaAccountNo] = useState(profile?.koreaAccountNo || "");
  const [koreaAccountCode, setKoreaAccountCode] = useState(profile?.koreaAccountCode || "01");

  useEffect(() => {
    if (isOpen) {
      if (profile) {
        setKoreaKey(profile.koreaAppKey || "");
        setKoreaSecret(profile.koreaAppSecret || "");
        setKoreaAccountNo(profile.koreaAccountNo || "");
        setKoreaAccountCode(profile.koreaAccountCode || "01");
      }
      setTestResult(null);
    }
  }, [isOpen, profile]);

  const [showConfirmStartLiveTrading, setShowConfirmStartLiveTrading] = useState(false);

  const requestSaveWithConfirm = () => {
    setShowConfirmStartLiveTrading(true);
  };

  const handleConfirmStartTrading = async () => {
    setShowConfirmStartLiveTrading(false);
    await executeSaveKorea();
  };

  const handleCancelAndDisconnectAll = async () => {
    setShowConfirmStartLiveTrading(false);
    setIsSaving(true);
    try {
      await updateProfileSettings({
        koreaAppKey: "",
        koreaAppSecret: "",
        koreaAccountNo: "",
        koreaAccountCode: "01",
        isRealTrade: false
      } as any);

      setKoreaKey("");
      setKoreaSecret("");
      setKoreaAccountNo("");
      clearBrokerError("korea");

      addToast({
        id: `disconnect_all_${Date.now()}`,
        type: "INFO",
        title: "한국투자증권 실거래 API 미연동 처리 완료",
        message: "한국투자증권 실거래 API가 안전하게 해제되었습니다.",
        timestamp: new Date().toLocaleTimeString("ko-KR")
      });
    } catch (e: any) {
      addToast({
        id: `disconnect_err_${Date.now()}`,
        type: "ERROR",
        title: "미연동 처리 오류",
        message: e.message || "오류가 발생했습니다.",
        timestamp: new Date().toLocaleTimeString("ko-KR")
      });
    } finally {
      setIsSaving(false);
    }
  };

  const executeSaveKorea = async () => {
    if (!koreaKey.trim() || !koreaSecret.trim()) {
      addToast({
        type: "WARNING",
        title: "입력 정보 확인",
        message: "한국투자증권 AppKey와 AppSecret을 모두 입력해 주세요."
      });
      return;
    }

    setIsSaving(true);
    try {
      await updateProfileSettings({
        koreaAppKey: koreaKey.trim(),
        koreaAppSecret: koreaSecret.trim(),
        koreaAccountNo: koreaAccountNo.trim(),
        koreaAccountCode: koreaAccountCode.trim(),
        isRealTrade: true
      });
      clearBrokerError("korea");

      // Save to server backend storage
      try {
        await fetch("/api/broker/credentials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            koreaAppKey: koreaKey.trim(),
            koreaAppSecret: koreaSecret.trim(),
            koreaAccountNo: koreaAccountNo.trim(),
            koreaAccountCode: koreaAccountCode.trim()
          })
        });
      } catch (e) {
        console.warn("Failed to persist KIS credentials to server:", e);
      }

      addToast({
        id: `save_${Date.now()}`,
        type: "SUCCESS",
        title: "한국투자증권 KIS Open API 실거래 연동 완료",
        message: "한국투자증권 KIS Developers Open API 실계좌 연동이 성공적으로 활성화되었습니다.",
        timestamp: new Date().toLocaleTimeString("ko-KR")
      });

      if (syncRealAccountBalance) {
        syncRealAccountBalance("korea", false).catch(e => console.warn(e));
      }
      onClose();
    } catch (e: any) {
      addToast({
        id: `err_${Date.now()}`,
        type: "ERROR",
        title: "저장 실패",
        message: e.message || "설정 저장 중 오류가 발생했습니다.",
        timestamp: new Date().toLocaleTimeString("ko-KR")
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!koreaKey.trim() || !koreaSecret.trim()) {
      setTestResult({
        success: false,
        message: "한국투자증권 AppKey와 AppSecret을 모두 입력해 주세요."
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/broker/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          broker: "korea",
          key: koreaKey.trim(),
          secret: koreaSecret.trim(),
          accountNo: koreaAccountNo.trim(),
          accountCode: koreaAccountCode.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({
          success: true,
          message: data.message || "한국투자증권 KIS Open API 실시간 토큰 발급 및 계좌 인증 성공!",
          balance: data.balance ? `실시간 조회 실계좌 잔고: ₩${Number(data.balance).toLocaleString()}원` : "한국투자증권 실계좌 연동 확인 완료"
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || data.message || "한국투자증권 API 인증 실패: AppKey, AppSecret, 계좌번호를 확인해 주세요."
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || "서버 통신 중 오류가 발생했습니다."
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/30 text-blue-400 border border-blue-500/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>한국투자증권 KIS 실거래 API 연동 센터</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
                  REAL KIS OPEN API
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                한국투자증권 KIS Developers 공식 OpenAPI를 통해 실시간 실계좌 잔고 조회 및 자동주문을 실행합니다.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {brokerApiError?.korea && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800 rounded-xl space-y-2 animate-in fade-in shadow-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-rose-900 dark:text-rose-200 font-extrabold text-xs">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>[한국투자증권 실거래 연동 안내] {brokerApiError.korea.errorMessage}</span>
                </div>
                <button
                  onClick={() => clearBrokerError("korea")}
                  className="text-[11px] text-slate-500 hover:text-slate-800 underline shrink-0 cursor-pointer font-bold"
                >
                  닫기
                </button>
              </div>
              {brokerApiError.korea.resolutionGuide && (
                <div className="text-[11px] text-rose-950 dark:text-rose-300 space-y-1 font-mono pl-6 pt-1 border-t border-rose-200/80 dark:border-rose-800/80">
                  {brokerApiError.korea.resolutionGuide.map((guide, idx) => (
                    <div key={idx}>{guide}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Guide Banner */}
          <div className="p-3.5 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 mt-0.5 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="text-xs text-blue-900 dark:text-blue-200 space-y-1">
              <div className="font-black flex items-center justify-between">
                <span>한국투자증권 KIS Developers Open API 안내</span>
                <a
                  href="https://apiportal.koreainvestment.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <span>포털 바로가기</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed">
                한국투자증권 포털(apiportal.koreainvestment.com)에서 발급받은 <strong>실전투자 AppKey</strong>와 <strong>AppSecret</strong>을 등록하시면 실계좌 잔고 실시간 동기화와 국내/해외주식 실체결 매매가 100% 자동 실행됩니다.
              </div>
            </div>
          </div>

          {/* Input Form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>AppKey (앱 키)</span>
                <span className="text-[10px] text-rose-500 font-bold">필수</span>
              </label>
              <input
                type="text"
                placeholder="한국투자증권 발급 실전 AppKey"
                value={koreaKey}
                onChange={(e) => setKoreaKey(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>AppSecret (앱 시크릿)</span>
                <button
                  onClick={() => setShowSecret(!showSecret)}
                  className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showSecret ? "숨기기" : "보기"}</span>
                </button>
              </label>
              <input
                type={showSecret ? "text" : "password"}
                placeholder="한국투자증권 발급 AppSecret"
                value={koreaSecret}
                onChange={(e) => setKoreaSecret(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>종합계좌번호 (앞 8자리)</span>
                <span className="text-[10px] text-slate-400 font-mono">예: 12345678</span>
              </label>
              <input
                type="text"
                maxLength={8}
                placeholder="12345678"
                value={koreaAccountNo}
                onChange={(e) => setKoreaAccountNo(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>계좌상품코드 (뒤 2자리)</span>
                <span className="text-[10px] text-slate-400 font-mono">기본값: 01 (종합매매)</span>
              </label>
              <input
                type="text"
                maxLength={2}
                placeholder="01"
                value={koreaAccountCode}
                onChange={(e) => setKoreaAccountCode(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Test & Verification Result Box */}
          <div className="p-4 bg-slate-900 text-white rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>한국투자증권 실서버 실시간 연결 검증</span>
              </div>

              <button
                onClick={handleTestConnection}
                disabled={isTesting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? "animate-spin" : ""}`} />
                <span>{isTesting ? "검증 중..." : "1-Click 실시간 연결 검증"}</span>
              </button>
            </div>

            {testResult && (
              <div className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                testResult.success 
                  ? "bg-emerald-950/80 border-emerald-700 text-emerald-200" 
                  : "bg-rose-950/80 border-rose-700 text-rose-200"
              }`}>
                <div className="font-bold flex items-center gap-1.5">
                  {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
                  <span>{testResult.message}</span>
                </div>
                {testResult.balance && (
                  <div className="font-mono text-[11px] text-emerald-300 bg-emerald-900/40 p-2 rounded border border-emerald-800/40">
                    {testResult.balance}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-100 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancelAndDisconnectAll}
              disabled={isSaving}
              className="px-3 py-1.5 rounded-lg text-xs font-extrabold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 hover:bg-rose-100 border border-rose-300 dark:border-rose-800 transition cursor-pointer flex items-center gap-1.5"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
              <span>실거래 API 미연동 (해제)</span>
            </button>
            <div className="hidden sm:flex items-center gap-1.5 text-slate-500 font-medium">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span>AES-256 로컬 암호화</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 transition cursor-pointer"
            >
              닫기
            </button>

            <button
              onClick={requestSaveWithConfirm}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isSaving ? "저장 중..." : "한국투자증권 실거래 연동 활성화"}</span>
            </button>
          </div>
        </div>

        {/* 실거래 시작 확인 팝업 모달 */}
        {showConfirmStartLiveTrading && (
          <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-slate-900 border-2 border-blue-500/80 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl space-y-4 animate-in zoom-in-95">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-1.5">
                    <span>한국투자증권 실거래 연동을 활성화하시겠습니까?</span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    입력하신 <strong>한국투자증권(KIS Open API)</strong> 계좌를 통해 실제 실계좌 잔고 조회 및 실시간 매매 주문이 활성화됩니다.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleCancelAndDisconnectAll}
                  className="py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer text-center"
                >
                  취소 (미연동)
                </button>
                <button
                  onClick={handleConfirmStartTrading}
                  className="py-2.5 px-4 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-500 text-white transition cursor-pointer shadow-lg shadow-blue-500/20 text-center"
                >
                  확인 (실거래 연동 시작)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
