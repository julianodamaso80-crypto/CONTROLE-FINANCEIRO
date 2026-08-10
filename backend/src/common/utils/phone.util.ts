/**
 * Normaliza telefone brasileiro para o formato usado pela Evolution API (JID):
 * somente dígitos, com DDI 55 prefixado.
 *
 * Aceita:
 * - "5521980214882"       (JID completo)
 * - "21980214882"         (DDD + número, 11 dígitos)
 * - "2198021488"          (DDD + número antigo, 10 dígitos)
 * - "(21) 98021-4882"     (formatado)
 * - "+55 21 98021-4882"   (com +)
 *
 * Retorna string com apenas dígitos começando por 55, ou null se inválido.
 */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;

  const digits = input.replace(/\D/g, '');
  if (!digits) return null;

  // Já tem DDI 55 e tamanho válido (12 = 55 + DDD + 8 dígitos, 13 = 55 + DDD + 9 dígitos)
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return addMissingNine(digits);
  }

  // Sem DDI, formato brasileiro (10 ou 11 dígitos) → prefixar 55
  if (digits.length === 10 || digits.length === 11) {
    return addMissingNine('55' + digits);
  }

  return null;
}

/**
 * Repõe o nono dígito quando o cliente digita o celular sem ele.
 *
 * Celular brasileiro tem 9 dígitos e começa com 9 desde 2016; quem escreve
 * "73 9901-8725" quer dizer "73 99901-8725". Sem essa correção o número é
 * gravado com 12 dígitos, e a mensagem de boas-vindas sai para um número que
 * não existe — foi o que aconteceu com um cliente em agosto/2026.
 *
 * Só mexe quando o primeiro dígito do número é 6-9 (faixa de celular). Fixos
 * (2-5) continuam com 8 dígitos, como devem.
 */
function addMissingNine(jid: string): string {
  if (jid.length !== 12) return jid;

  const numero = jid.slice(4);
  if (!/^[6-9]/.test(numero)) return jid;

  return jid.slice(0, 4) + '9' + numero;
}

/**
 * Retorna as variantes de um phone JID brasileiro pra tolerar a presença
 * ou ausência do "9 extra" do celular. Necessário porque alguns DDDs antigos
 * ainda têm linhas com 8 dígitos pós-DDD, e o usuário pode digitar com 9 a
 * mais (ou a menos) sem perceber.
 *
 * Ex: '5562998173810' (13) → ['5562998173810', '556298173810']
 * Ex: '556298173810'  (12) → ['556298173810',  '5562998173810']
 */
export function phoneVariants(phone: string): string[] {
  if (!phone) return [];
  const variants = new Set<string>([phone]);

  // 13 dígitos com '9' na posição 4 (após 55+DDD) → variante sem o 9 extra
  if (phone.length === 13 && phone[4] === '9') {
    variants.add(phone.slice(0, 4) + phone.slice(5));
  }

  // 12 dígitos → variante com '9' extra inserido após DDI+DDD
  if (phone.length === 12) {
    variants.add(phone.slice(0, 4) + '9' + phone.slice(4));
  }

  return Array.from(variants);
}
