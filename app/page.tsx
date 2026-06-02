'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setTimeout(() => router.replace('/dashboard'), 2200)
      } else {
        setTimeout(() => router.replace('/landing'), 2200)
      }
    })
  }, [])

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes as-ringOut {
          0%   { opacity: 0;  transform: translate(-50%,-50%) scale(.35); }
          18%  { opacity: .6; }
          100% { opacity: 0;  transform: translate(-50%,-50%) scale(1.5); }
        }
        @keyframes as-rise {
          0%   { clip-path: inset(100% 0 0 0); transform: translateY(10px) scale(.92); }
          60%  { clip-path: inset(0 0 0 0);    transform: translateY(0) scale(1.03); }
          100% { clip-path: inset(0 0 0 0);    transform: translateY(0) scale(1); }
        }
        @keyframes as-floaty { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes as-fadeUp { to { opacity: 1; transform: translateY(0); } }
        @keyframes as-slide { 0% { left: -45%; } 100% { left: 103%; } }
        @keyframes as-fadeIn { to { opacity: 1; } }
        .as-splash {
          position: fixed; inset: 0; z-index: 9999; overflow: hidden;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          background: radial-gradient(120% 90% at 50% 18%, #3B82F6 0%, #2563EB 34%, #1D4ED8 66%, #1A368F 100%);
          font-family: "Inter", -apple-system, system-ui, sans-serif;
        }
        .as-glow {
          position: absolute; top: -160px; left: 50%; transform: translateX(-50%);
          width: 460px; height: 460px; border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,.30), transparent 62%);
          pointer-events: none;
        }
        .as-ring {
          position: absolute; left: 50%; top: 42%; width: 260px; height: 260px;
          border: 1px solid rgba(255,255,255,.16); border-radius: 50%;
          transform: translate(-50%,-50%) scale(.35); opacity: 0;
          animation: as-ringOut 3.6s ease-out infinite; pointer-events: none;
        }
        .as-ring1 { animation-delay: .2s; }
        .as-ring2 { animation-delay: 1.4s; }
        .as-ring3 { animation-delay: 2.6s; }
        .as-brand { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; }
        .as-mark { width: 104px; height: 104px; filter: drop-shadow(0 14px 30px rgba(7,18,60,.45)); animation: as-floaty 4s ease-in-out 1.1s infinite; }
        .as-reveal { width: 100%; height: 100%; clip-path: inset(100% 0 0 0); animation: as-rise 1s cubic-bezier(.22,1,.36,1) .15s forwards; }
        .as-reveal svg { display: block; width: 100%; height: 100%; }
        .as-wordmark { margin-top: 22px; font-size: 30px; font-weight: 700; letter-spacing: -.035em; color: #fff; opacity: 0; transform: translateY(10px); animation: as-fadeUp .7s ease .75s forwards; }
        .as-wordmark span { font-weight: 300; color: rgba(255,255,255,.82); }
        .as-tagline { margin-top: 8px; font-size: 12.5px; font-weight: 500; letter-spacing: .04em; color: rgba(255,255,255,.72); opacity: 0; transform: translateY(8px); animation: as-fadeUp .7s ease 1s forwards; }
        .as-loader { position: absolute; bottom: 72px; left: 50%; transform: translateX(-50%); width: 150px; height: 4px; border-radius: 99px; background: rgba(255,255,255,.20); overflow: hidden; opacity: 0; animation: as-fadeIn .6s ease 1.2s forwards; }
        .as-loader span { position: absolute; top: 0; left: -45%; height: 100%; width: 42%; border-radius: 99px; background: linear-gradient(90deg, rgba(255,255,255,.2), #fff 50%, rgba(255,255,255,.2)); animation: as-slide 1.4s ease-in-out 1.3s infinite; }
      `}</style>

      <div className="as-splash" role="status" aria-label="Loading ApexScale">
        <div className="as-glow" aria-hidden="true" />
        <span className="as-ring as-ring1" aria-hidden="true" />
        <span className="as-ring as-ring2" aria-hidden="true" />
        <span className="as-ring as-ring3" aria-hidden="true" />
        <div className="as-brand">
          <div className="as-mark">
            <div className="as-reveal">
              <svg viewBox="0 0 64 64" aria-hidden="true">
                <path fill="#fff" opacity="0.55" d="M32 7 L10 50 Q8 54 13 54 L24 54 L32 36 Z" />
                <path fill="#fff" d="M32 7 L54 50 Q56 54 51 54 L40 54 L32 36 Z" />
              </svg>
            </div>
          </div>
          <div className="as-wordmark">Apex<span>Scale</span></div>
          <div className="as-tagline">From quote to signed</div>
        </div>
        <div className="as-loader" aria-hidden="true"><span /></div>
      </div>
    </>
  )
}
