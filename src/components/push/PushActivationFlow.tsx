'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, HelpCircle } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useInstallPrompt } from '@/components/app-shell/InstallPromptProvider';
import { InstallHelpSheet } from '@/components/app-shell/InstallHelpSheet';

interface PushActivationFlowProps {
  slug: string;
  /** Classe do botão principal ("Ativar"/"Enviar teste") — cada contexto
   *  (banner rosa vs. cartão branco de Config) usa uma paleta diferente. */
  primaryButtonClassName: string;
  secondaryButtonClassName: string;
  /** Classe do texto explicativo (pergunta de confirmação, checklist de
   *  troubleshooting, status "ativo") — precisa ter contraste com o fundo
   *  de cada contexto (card branco em Config vs. banner rosa no Início). */
  textClassName?: string;
  /** Chamado quando a ativação é confirmada (a profissional respondeu "Sim,
   *  recebi", ou a permissão já vinha concedida de uma visita anterior) —
   *  o banner do Início usa isso pra se dispensar sozinho; a seção de
   *  Config ignora e continua mostrando o status permanentemente. */
  onConfirmed?: () => void;
}

type Phase = 'idle' | 'activating' | 'confirming' | 'confirmed' | 'troubleshooting';

/** Núcleo da ativação de push, reaproveitado na Central de notificações
 *  (`NotificationCenterSheet`, aberta pelo sino no cabeçalho) e na seção
 *  persistente de Config (`NotificationsSection`). Depois de ativar, manda
 *  uma notificação de
 *  teste de verdade e pergunta se chegou — a permissão do site
 *  (`Notification.permission`) pode aparecer como concedida mesmo com a
 *  notificação do Chrome desligada no nível do Android, e não tem nenhuma
 *  API de navegador pra detectar isso automaticamente. Se não chegar,
 *  mostra o checklist de troubleshooting em vez de deixar a profissional
 *  achando que está tudo certo. */
export const PushActivationFlow: React.FC<PushActivationFlowProps> = ({
  slug,
  primaryButtonClassName,
  secondaryButtonClassName,
  textClassName = 'text-ink-soft',
  onConfirmed,
}) => {
  const { permission, subscribed, subscribing, subscribe, sendTest, available } = usePushNotifications(slug);
  const { isIOS, isInstalled } = useInstallPrompt();
  const [phase, setPhase] = useState<Phase>('idle');
  const [sendingTest, setSendingTest] = useState(false);
  // F12.3: em vez de só perguntar "recebeu?", diz o motivo quando o servidor
  // já sabe que não foi (sem chaves, aparelho não inscrito, limite).
  const [testProblem, setTestProblem] = useState('');
  const [activateError, setActivateError] = useState('');
  const [installHelpOpen, setInstallHelpOpen] = useState(false);

  // `usePushNotifications` só sabe a permissão real depois de montar (lê
  // `Notification.permission` num efeito) — nesse primeiro render ela ainda
  // está no valor padrão. Sem isso, toda vez que esse componente remonta
  // (abrir a Central de notificações nesse cabeçalho de novo, entrar em
  // Config) ele "esquecia" que já tinha sido ativado antes e mostrava o
  // convite de novo, mesmo já ativo.
  // "Ativo" = permissão concedida E inscrição ainda existente neste aparelho.
  // Se a inscrição sumiu (ex: "Cancelar inscrição" da notificação do Chrome)
  // ou a permissão foi revogada, sai do "confirmado" e volta a oferecer
  // "Ativar notificações" — antes ficava dizendo "ativas" sem estar.
  const isActive = permission === 'granted' && subscribed !== false;
  useEffect(() => {
    if (isActive) {
      setPhase((prev) => (prev === 'idle' || prev === 'activating' ? 'confirmed' : prev));
    } else {
      setPhase((prev) => (prev === 'confirmed' ? 'idle' : prev));
    }
  }, [isActive]);

  const confirm = () => {
    setPhase('confirmed');
    onConfirmed?.();
  };

  const runTest = async () => {
    setSendingTest(true);
    setTestProblem('');
    setPhase('confirming');
    const result = await sendTest();
    if (!result.ok) {
      setTestProblem(
        !result.configured
          ? 'As notificações do LashAgenda ainda estão sendo ligadas. Assim que estiverem prontas, é só testar de novo.'
          : result.devices === 0
            ? 'Este aparelho não ficou inscrito. Toque em "Ativar notificações" de novo.'
            : result.message || 'O aviso não saiu agora. Tente de novo em instantes.'
      );
      if (result.configured && result.devices === 0) setPhase('idle');
    }
    setSendingTest(false);
  };

  const handleActivate = async () => {
    setPhase('activating');
    setActivateError('');
    const ok = await subscribe();
    if (!ok) {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        setActivateError('Não deu certo ativar neste aparelho. Tente de novo.');
      }
      setPhase('idle');
      return;
    }
    await runTest();
  };

  const textClass = `text-[13px] leading-relaxed ${textClassName}`;

  // iPhone: notificação só existe no app instalado na tela de início (o
  // Safari aberto não tem o recurso). Leva ao passo a passo (F12.3).
  if (permission === 'unsupported') {
    if (isIOS && !isInstalled) {
      return (
        <div className="flex flex-col gap-2" data-push-state="ios-install">
          <p className={textClass}>No iPhone, os avisos só chegam com o LashAgenda instalado na tela de início. Instale e abra por lá para ativar.</p>
          <button type="button" onClick={() => setInstallHelpOpen(true)} className={primaryButtonClassName}>
            Ver como instalar
          </button>
          {installHelpOpen && <InstallHelpSheet platform="ios" onClose={() => setInstallHelpOpen(false)} />}
        </div>
      );
    }
    return (
      <p className={textClass} data-push-state="unsupported">
        Este navegador não recebe notificações. No Android, use o Chrome; no iPhone, o app instalado na tela de início.
      </p>
    );
  }

  if (!available) {
    return (
      <p className={textClass} data-push-state="unavailable">
        As notificações estão sendo preparadas e ficam disponíveis aqui em breve.
      </p>
    );
  }

  if (permission === 'denied') {
    return (
      <p className={`text-[13px] leading-relaxed ${textClassName}`}>
        As notificações estão bloqueadas pro LashAgenda nesse navegador. Pra reativar: menu do navegador → Configurações do site → Notificações → mude pra "Permitir".
      </p>
    );
  }

  if (phase === 'confirming') {
    return (
      <div>
        {testProblem && !sendingTest ? (
          <>
            <p className={`${textClass} mb-2`}>{testProblem}</p>
            <button type="button" onClick={runTest} className={secondaryButtonClassName}>
              Testar de novo
            </button>
          </>
        ) : (
          <p className={`text-[13px] mb-2 ${textClassName}`}>{sendingTest ? 'Enviando notificação de teste...' : 'Enviamos uma notificação de teste — você recebeu?'}</p>
        )}
        {!sendingTest && !testProblem && (
          <div className="flex gap-2">
            <button type="button" onClick={confirm} className={primaryButtonClassName}>
              Sim, recebi
            </button>
            <button type="button" onClick={() => setPhase('troubleshooting')} className={secondaryButtonClassName}>
              Não recebi
            </button>
          </div>
        )}
      </div>
    );
  }

  if (phase === 'troubleshooting') {
    return (
      <div className="flex flex-col gap-2">
        <div className={`flex items-start gap-2 text-[13px] leading-relaxed ${textClassName}`}>
          <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {isIOS ? (
            <p>
              No iPhone: Ajustes → Notificações → LashAgenda → confirme que &quot;Permitir Notificações&quot; está ligado.
              Se o modo Foco (Não Perturbe) estiver ativo, o aviso fica escondido.
            </p>
          ) : (
            <p>
              É comum o celular ter uma permissão separada pro navegador em si. No Android: Configurações → Apps →
              Chrome → Notificações → confirme que está ativado (é diferente da permissão do site que você acabou de
              aceitar). Economia de bateria também pode segurar o aviso.
            </p>
          )}
        </div>
        <button type="button" onClick={runTest} disabled={sendingTest} className={secondaryButtonClassName}>
          {sendingTest ? 'Enviando...' : 'Testar de novo'}
        </button>
      </div>
    );
  }

  if (phase === 'confirmed') {
    return (
      <div className="flex flex-col items-center text-center gap-1.5">
        <span className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6" />
        </span>
        <p className="text-base font-bold text-emerald-700">Notificações ativas!</p>
        <p className={`text-[15px] leading-snug ${textClassName}`}>Você vai receber um aviso neste aparelho quando uma cliente agendar ou cancelar.</p>
        {testProblem && <p className={textClass}>{testProblem}</p>}
        {/* Teste de novo fica discreto (link), não um botão do tamanho do
         *  principal — o estado agora é "está tudo certo", não "falta testar". */}
        <button type="button" onClick={runTest} disabled={sendingTest} className="mt-1 text-[15px] font-semibold text-rose-700 underline underline-offset-2 disabled:opacity-50">
          {sendingTest ? 'Enviando...' : 'Enviar teste de novo'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={handleActivate} disabled={subscribing || phase === 'activating'} className={primaryButtonClassName} data-push-state="idle">
        {subscribing || phase === 'activating' ? 'Ativando...' : 'Ativar notificações'}
      </button>
      {(activateError || testProblem) && <p className={textClass}>{activateError || testProblem}</p>}
    </div>
  );
};
