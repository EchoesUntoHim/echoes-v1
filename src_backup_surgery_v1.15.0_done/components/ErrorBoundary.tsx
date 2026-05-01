import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { GlassCard } from './GlassCard';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let isFirebaseError = false;
      let firebaseMsg = "";
      
      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error && (parsed.operationType || parsed.authInfo)) {
            isFirebaseError = true;
            firebaseMsg = parsed.error;
          }
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen bg-[#0A192F] flex items-center justify-center p-6 font-sans">
          <GlassCard className="max-w-md w-full p-8 border-red-500/20 text-center space-y-6">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">문제가 발생했습니다</h2>
              <p className="text-gray-400 text-sm">
                {isFirebaseError 
                  ? "데이터베이스 연결 중 오류가 발생했습니다. 권한 설정을 확인해주세요."
                  : "애플리케이션 실행 중 예기치 않은 오류가 발생했습니다."}
              </p>
            </div>

            {this.state.error && (
              <div className="p-4 bg-black/40 rounded-xl border border-white/5 text-left">
                <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">상세 에러 내용</p>
                <p className="text-xs text-red-400 font-mono break-all line-clamp-4">
                  {isFirebaseError ? firebaseMsg : this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleReset}
                className="w-full py-3 bg-primary text-background rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                다시 시도하기
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="w-full py-3 bg-white/5 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-all border border-white/10"
              >
                <Home className="w-4 h-4" />
                홈으로 이동
              </button>
            </div>
          </GlassCard>
        </div>
      );
    }

    return this.props.children;
  }
}
