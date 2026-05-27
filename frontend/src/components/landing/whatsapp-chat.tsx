import { Check, CheckCheck, ArrowLeft, Phone, Video, MoreVertical } from 'lucide-react';

type Message = {
  from: 'sent' | 'received';
  text?: string;
  audioSeconds?: number;
  image?: { caption: string; preview: string };
  time: string;
  read?: boolean;
  redactedAfter?: number;
};

export type WhatsAppChatProps = {
  contactName: string;
  contactRedacted?: boolean;
  contactSubtitle?: string;
  contactAvatar: string;
  groupTitle?: string;
  messages: Message[];
  rotate?: number;
};

const SCRIBBLE_PATHS = [
  'M 2 8 C 18 2, 35 14, 52 6 S 88 12, 105 7 S 142 14, 158 8 S 192 14, 210 9',
  'M 3 9 C 22 4, 40 13, 60 7 S 96 13, 116 8 S 150 14, 170 9 S 200 13, 220 8',
  'M 4 7 C 20 12, 38 4, 56 10 S 92 5, 112 11 S 148 6, 168 11 S 198 7, 218 11',
];

function Scribble({ width = 200, height = 18, seed = 0 }: { width?: number; height?: number; seed?: number }) {
  const path = SCRIBBLE_PATHS[seed % SCRIBBLE_PATHS.length];
  return (
    <svg
      viewBox="0 0 220 18"
      preserveAspectRatio="none"
      width={width}
      height={height}
      className="pointer-events-none absolute inset-0"
      aria-hidden="true"
    >
      <path
        d={path}
        stroke="#0f0f0f"
        strokeWidth="9"
        fill="none"
        strokeLinecap="round"
        opacity="0.94"
        style={{ filter: 'blur(0.2px)' }}
      />
      <path
        d={path}
        stroke="#0f0f0f"
        strokeWidth="11"
        fill="none"
        strokeLinecap="round"
        opacity="0.6"
        transform="translate(0,1)"
      />
    </svg>
  );
}

function MessageBubble({ msg, index }: { msg: Message; index: number }) {
  const isSent = msg.from === 'sent';
  const bubbleBg = isSent ? 'bg-[#d9fdd3]' : 'bg-white';
  const tailColor = isSent ? '#d9fdd3' : '#ffffff';

  return (
    <div className={`flex w-full ${isSent ? 'justify-end' : 'justify-start'} mb-1.5`}>
      <div className="relative max-w-[78%]">
        {!isSent && index === 0 && (
          <span
            className="absolute -left-1.5 top-0 h-0 w-0"
            style={{
              borderTop: `8px solid ${tailColor}`,
              borderLeft: '8px solid transparent',
              filter: 'drop-shadow(0 1px 0.5px rgba(11,20,26,0.13))',
            }}
          />
        )}
        {isSent && index === 0 && (
          <span
            className="absolute -right-1.5 top-0 h-0 w-0"
            style={{
              borderTop: `8px solid ${tailColor}`,
              borderRight: '8px solid transparent',
              filter: 'drop-shadow(0 1px 0.5px rgba(11,20,26,0.13))',
            }}
          />
        )}

        <div
          className={`${bubbleBg} relative rounded-lg px-2.5 py-1.5 pb-4 shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]`}
          style={isSent ? { borderTopRightRadius: index === 0 ? 0 : '0.5rem' } : { borderTopLeftRadius: index === 0 ? 0 : '0.5rem' }}
        >
          {msg.audioSeconds !== undefined && (
            <div className="flex items-center gap-2 py-0.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#00a884] text-white">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <div className="flex items-center gap-0.5">
                {[3, 5, 8, 6, 10, 7, 9, 5, 12, 8, 6, 4, 9, 7, 5, 8, 6, 10, 4, 7].map((h, i) => (
                  <div key={i} className="w-[1.5px] rounded-full bg-[#8696a0]" style={{ height: `${h}px` }} />
                ))}
              </div>
              <span className="ml-1 text-[11px] text-[#667781]">
                {String(Math.floor(msg.audioSeconds / 60)).padStart(2, '0')}:
                {String(msg.audioSeconds % 60).padStart(2, '0')}
              </span>
            </div>
          )}

          {msg.image && (
            <div className="-mx-1 -mt-0.5 mb-1.5 overflow-hidden rounded-md">
              <div className="relative h-32 w-full bg-gradient-to-br from-[#e9edef] via-[#d1d7db] to-[#aebac1]">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto mb-1 h-10 w-10 rounded border border-[#8696a0]/40 bg-white/80" />
                    <p className="text-[10px] font-semibold text-[#3b4a54]">{msg.image.preview}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {msg.text && (
            <div className="relative inline-block">
              <p className="break-words pr-12 text-[14.2px] leading-[19px] text-[#111b21]">
                {msg.text}
              </p>
              {msg.redactedAfter !== undefined && msg.text.length > msg.redactedAfter && (
                <span
                  className="absolute"
                  style={{
                    left: `${msg.redactedAfter * 7.2}px`,
                    top: '2px',
                    width: `${Math.min((msg.text.length - msg.redactedAfter) * 7.5, 200)}px`,
                    height: '16px',
                  }}
                >
                  <Scribble
                    width={Math.min((msg.text.length - msg.redactedAfter) * 7.5, 200)}
                    height={16}
                    seed={index}
                  />
                </span>
              )}
            </div>
          )}

          <div className="absolute bottom-1 right-2 flex items-center gap-0.5">
            <span className="text-[10.5px] leading-none text-[#667781]">{msg.time}</span>
            {isSent && (
              msg.read ? (
                <CheckCheck className="h-[14px] w-[14px] text-[#53bdeb]" strokeWidth={2.5} />
              ) : (
                <Check className="h-[14px] w-[14px] text-[#667781]" strokeWidth={2.5} />
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function WhatsAppChat({
  contactName,
  contactRedacted = false,
  contactSubtitle = 'online',
  contactAvatar,
  groupTitle,
  messages,
  rotate = 0,
}: WhatsAppChatProps) {
  return (
    <div
      className="relative inline-block w-full max-w-[340px]"
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <div
        className="overflow-hidden rounded-[14px] border-[3px] border-black bg-[#efeae2]"
        style={{ boxShadow: '8px 8px 0px 0px #000000' }}
      >
        <div className="flex items-center gap-2.5 bg-[#008069] px-3 py-2 text-white">
          <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-white text-[#008069]">
            <div className="flex h-full w-full items-center justify-center font-bold">
              {contactAvatar}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="relative inline-block">
              <p className="truncate text-[15px] font-semibold leading-tight">
                {contactName}
              </p>
              {contactRedacted && (
                <span
                  className="absolute"
                  style={{ left: `${contactName.indexOf(' ') * 7.5 + 8}px`, top: '0', width: '90px', height: '18px' }}
                >
                  <Scribble width={90} height={18} seed={1} />
                </span>
              )}
            </div>
            <p className="truncate text-[12px] leading-tight text-white/80">
              {contactSubtitle}
            </p>
          </div>
          <Video className="h-5 w-5" strokeWidth={2.2} />
          <Phone className="h-[18px] w-[18px]" strokeWidth={2.2} />
          <MoreVertical className="h-5 w-5" strokeWidth={2.2} />
        </div>

        {groupTitle && (
          <div className="relative bg-[#fef9c3] px-3 py-1.5 text-center text-[11px] font-semibold text-[#3b4a54]">
            {groupTitle}
          </div>
        )}

        <div
          className="relative px-3 py-3"
          style={{
            backgroundColor: '#efeae2',
            backgroundImage:
              'radial-gradient(circle at 10% 20%, rgba(15,20,25,0.04) 0px, transparent 35px), radial-gradient(circle at 80% 60%, rgba(15,20,25,0.04) 0px, transparent 35px), radial-gradient(circle at 50% 80%, rgba(15,20,25,0.03) 0px, transparent 25px)',
            backgroundSize: '120px 120px',
            minHeight: '260px',
          }}
        >
          <div className="mb-3 flex justify-center">
            <span className="rounded-md bg-[#e1f3fb] px-2 py-1 text-[11px] font-medium text-[#3b4a54] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]">
              hoje
            </span>
          </div>

          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
