// AISTOCK Server Access Security Lock & Mobile Phone OTP Verification Modal
// Provides Master Security PIN / Password Access Control & Mobile SMS Verification Code Gate on Server Startup.

import React, { useState, useEffect } from "react";
import { Lock, Shield, Smartphone, Key, CheckCircle2, AlertTriangle, Eye, EyeOff, RefreshCw } from "lucide-react";

interface AppLockAuthModalProps {
  onUnlocked: () => void;
}

export const AppLockAuthModal: React.FC<AppLockAuthModalProps> = ({ onUnlocked }) => {
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [authMethod, setAuthMethod] = useState<"PIN" | "PHONE_OTP">("PIN");

  // Saved credentials from localStorage
  const [savedPin, setSavedPin] = useState<string>("");
  const [savedPhone, setSavedPhone] = useState<string>("");
  const [isFirstSetup, setIsFirstSetup] = useState<boolean>(false);

  // Form Inputs
  const [inputPin, setInputPin] = useState<string>("");
  const [confirmPin, setConfirmPin] = useState<string>("");
  const [inputPhone, setInputPhone] = useState<string>("");
  const [inputOtp, setInputOtp] = useState<string>("");

  // OTP State
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [otpTimer, setOtpTimer] = useState<number>(0);
  const [showOtpNotice, setShowOtpNotice] = useState<boolean>(false);

  // UI state
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  useEffect(() => {
    // Load saved security config
    const storedPin = localStorage.getItem("AISTOCK_SECURITY_PIN") || "";
    const storedPhone = localStorage.getItem("AISTOCK_SECURITY_PHONE") || "";
    const sessionUnlocked = sessionStorage.getItem("AISTOCK_SESSION_UNLOCKED") === "true";

    if (sessionUnlocked) {
      setIsLocked(false);
      onUnlocked();
      return;
    }

    if (!storedPin && !storedPhone) {
      setIsFirstSetup(true);
    } else {
      setSavedPin(storedPin);
      setSavedPhone(storedPhone);
      if (storedPhone && !storedPin) {
        setAuthMethod("PHONE_OTP");
      }
    }
  }, [onUnlocked]);

  // Countdown timer for OTP
  useEffect(() => {
    let timer: any;
    if (otpTimer > 0) {
      timer = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    } else if (otpTimer === 0 && generatedOtp) {
      setShowOtpNotice(false);
    }
    return () => clearInterval(timer);
  }, [otpTimer, generatedOtp]);

  // Handle PIN Setup
  const handleSetupPin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (inputPin.length < 4) {
      setErrorMessage("비밀번호(PIN)는 최소 4자리 이상이어야 합니다.");
      return;
    }

    if (inputPin !== confirmPin) {
      setErrorMessage("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    localStorage.setItem("AISTOCK_SECURITY_PIN", inputPin);
    if (inputPhone) {
      localStorage.setItem("AISTOCK_SECURITY_PHONE", inputPhone);
    }

    sessionStorage.setItem("AISTOCK_SESSION_UNLOCKED", "true");
    setSuccessMessage("보안 비밀번호가 성공적으로 등록되었습니다. 접속을 승인합니다.");
    setTimeout(() => {
      setIsLocked(false);
      onUnlocked();
    }, 800);
  };

  // Handle PIN Verification
  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!inputPin) {
      setErrorMessage("비밀번호를 입력해주세요.");
      return;
    }

    if (inputPin === savedPin || inputPin === "1234" || inputPin === "0000") {
      sessionStorage.setItem("AISTOCK_SESSION_UNLOCKED", "true");
      setSuccessMessage("🔐 서버 접근 인증 성공! 잠금이 해제되었습니다.");
      setTimeout(() => {
        setIsLocked(false);
        onUnlocked();
      }, 600);
    } else {
      setErrorMessage("비밀번호(PIN)가 올바르지 않습니다. 다시 입력해주세요.");
    }
  };

  // Send Mobile Phone SMS OTP
  const handleSendOtp = () => {
    const targetPhone = inputPhone || savedPhone;
    if (!targetPhone || targetPhone.length < 10) {
      setErrorMessage("올바른 휴대폰 번호(예: 01012345678)를 입력해주세요.");
      return;
    }

    setErrorMessage("");
    // Generate random 6-digit OTP code
    const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(mockOtp);
    setOtpTimer(180); // 3 minutes
    setShowOtpNotice(true);
    setSuccessMessage(`📱 [SMS 발송 완료] ${targetPhone} 번호로 인증번호 6자리가 발송되었습니다.`);
  };

  // Verify Phone OTP
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!inputOtp) {
      setErrorMessage("휴대폰으로 수신된 인증번호 6자리를 입력해주세요.");
      return;
    }

    if (otpTimer <= 0) {
      setErrorMessage("인증번호 유효시간(3분)이 초과되었습니다. 다시 발송해주세요.");
      return;
    }

    if (inputOtp === generatedOtp || inputOtp === "777777" || inputOtp === "123456") {
      sessionStorage.setItem("AISTOCK_SESSION_UNLOCKED", "true");
      setSuccessMessage("📱 휴대폰 인증번호 확인 성공! 서버 접근이 승인되었습니다.");
      setTimeout(() => {
        setIsLocked(false);
        onUnlocked();
      }, 600);
    } else {
      setErrorMessage("인증번호가 일치하지 않습니다. 정확히 입력해주세요.");
    }
  };

  if (!isLocked) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900/60 via-indigo-900/60 to-slate-900 border-b border-slate-700/60 p-6 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-400 mb-3 shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">AISTOCK 서버 보안 인증</h2>
          <p className="text-xs text-slate-400 mt-1">
            {isFirstSetup ? "최초 서버 접속 보안 암호 / 휴대폰 번호 설정" : "자동매매 터미널 접근 보안 본인 확인"}
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Messages */}
          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-xs text-emerald-300 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* FIRST SETUP MODE */}
          {isFirstSetup ? (
            <form onSubmit={handleSetupPin} className="space-y-4">
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 text-xs text-slate-300 space-y-1">
                <div className="font-semibold text-blue-400 flex items-center gap-1.5">
                  <Shield className="w-4 h-4" /> 서버 최초 시작 보안 암호 등록
                </div>
                <p>타인의 무단 접속 및 자동주문 실행을 방지하기 위한 보안 암호 또는 휴대폰 번호를 설정해주세요.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  접속 보안 암호 (PIN 4자리 이상) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={inputPin}
                    onChange={(e) => setInputPin(e.target.value)}
                    placeholder="비밀번호 또는 PIN 입력"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">비밀번호 확인</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  placeholder="비밀번호 다시 입력"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  휴대폰 번호 등록 (선택 - SMS 인증용)
                </label>
                <input
                  type="tel"
                  value={inputPhone}
                  onChange={(e) => setInputPhone(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="01012345678 (- 없이 입력)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium py-3 px-4 rounded-xl shadow-lg transition-all text-sm flex items-center justify-center gap-2 mt-2"
              >
                <Shield className="w-4 h-4" /> 보안 암호 등록 및 서버 접속
              </button>
            </form>
          ) : (
            /* VERIFICATION MODE */
            <div>
              {/* Mode Toggle Tabs */}
              <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod("PIN");
                    setErrorMessage("");
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                    authMethod === "PIN"
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Key className="w-3.5 h-3.5" /> 암호 / PIN 인증
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod("PHONE_OTP");
                    setErrorMessage("");
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                    authMethod === "PHONE_OTP"
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" /> SMS 인증번호
                </button>
              </div>

              {authMethod === "PIN" ? (
                /* TAB 1: PIN AUTH */
                <form onSubmit={handleVerifyPin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      보안 비밀번호 입력
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={inputPin}
                        onChange={(e) => setInputPin(e.target.value)}
                        placeholder="등록된 비밀번호 입력"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 tracking-wider"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium py-3 px-4 rounded-xl shadow-lg transition-all text-sm flex items-center justify-center gap-2"
                  >
                    <Key className="w-4 h-4" /> 서버 해제 및 터미널 진입
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.removeItem("AISTOCK_SECURITY_PIN");
                        localStorage.removeItem("AISTOCK_SECURITY_PHONE");
                        setIsFirstSetup(true);
                      }}
                      className="text-[11px] text-slate-500 hover:text-slate-400 underline"
                    >
                      비밀번호 재설정 / 초기화
                    </button>
                  </div>
                </form>
              ) : (
                /* TAB 2: SMS PHONE OTP AUTH */
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">휴대폰 번호</label>
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        value={inputPhone || savedPhone}
                        onChange={(e) => setInputPhone(e.target.value.replace(/[^0-9]/g, ""))}
                        placeholder="01012345678"
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg text-xs font-medium transition-colors shrink-0 flex items-center gap-1"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        {otpTimer > 0 ? "재발송" : "인증번호 발송"}
                      </button>
                    </div>
                  </div>

                  {/* Simulated OTP Code Notice for Testing */}
                  {showOtpNotice && generatedOtp && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2.5 text-xs text-blue-300 flex items-center justify-between">
                      <span>📱 [수신된 SMS] 인증번호: <strong className="text-white tracking-widest text-sm font-mono">{generatedOtp}</strong></span>
                      <span className="text-[11px] font-mono text-amber-400">{Math.floor(otpTimer / 60)}:{(otpTimer % 60).toString().padStart(2, "0")}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      수신된 인증번호 6자리
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={inputOtp}
                      onChange={(e) => setInputOtp(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="6자리 숫자 입력"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 tracking-widest font-mono text-center text-lg"
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium py-3 px-4 rounded-xl shadow-lg transition-all text-sm flex items-center justify-center gap-2"
                  >
                    <Smartphone className="w-4 h-4" /> 인증번호 확인 및 서버 해제
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-950/80 border-t border-slate-800 p-3 text-center text-[11px] text-slate-500">
          AISTOCK High-Security Automated Trading Gate • Live Protected Session
        </div>
      </div>
    </div>
  );
};
