/**
 * Parser leve de arquivos OFX (1.x/SGML e 2.x/XML).
 * Extrai apenas o que precisamos: lista de transações + saldo.
 */

export interface OfxTransaction {
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  date: Date;
  description: string;
  fitId: string;
  checkNum?: string;
}

export interface OfxStatement {
  bankId?: string;
  accountId?: string;
  currency?: string;
  startDate?: Date;
  endDate?: Date;
  balance?: number;
  transactions: OfxTransaction[];
}

export function parseOfx(content: string): OfxStatement {
  // Remove cabeçalho SGML (linhas tipo OFXHEADER:100, DATA:OFXSGML, etc.)
  const sgmlBodyStart = content.indexOf('<OFX>');
  const body = sgmlBodyStart >= 0 ? content.slice(sgmlBodyStart) : content;

  // Pega blocos
  const bankId = pickValue(body, 'BANKID');
  const accountId = pickValue(body, 'ACCTID');
  const currency = pickValue(body, 'CURDEF');

  const dtStart = parseOfxDate(pickValue(body, 'DTSTART'));
  const dtEnd = parseOfxDate(pickValue(body, 'DTEND'));

  // Saldo final
  const ledgerBalanceBlock = sliceBlock(body, 'LEDGERBAL');
  const balance = ledgerBalanceBlock
    ? parseFloat(pickValue(ledgerBalanceBlock, 'BALAMT') ?? '0')
    : undefined;

  // Transações (STMTTRN)
  const transactions: OfxTransaction[] = [];
  const trnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let m: RegExpExecArray | null;
  while ((m = trnRegex.exec(body)) !== null) {
    const block = m[1] ?? '';
    const trnAmt = pickValue(block, 'TRNAMT');
    const dtPosted = pickValue(block, 'DTPOSTED');
    const memo = pickValue(block, 'MEMO');
    const name = pickValue(block, 'NAME');
    const fitId = pickValue(block, 'FITID');
    const checkNum = pickValue(block, 'CHECKNUM');
    const trnType = pickValue(block, 'TRNTYPE');

    if (trnAmt === undefined || dtPosted === undefined) continue;

    const amount = parseFloat(trnAmt);
    if (isNaN(amount)) continue;

    transactions.push({
      type: amount >= 0 ? 'INCOME' : 'EXPENSE',
      amount: Math.abs(amount),
      date: parseOfxDate(dtPosted) ?? new Date(),
      description: (name ?? memo ?? trnType ?? 'Transação OFX').trim(),
      fitId: fitId ?? `${dtPosted}-${trnAmt}`,
      checkNum,
    });
  }

  return {
    bankId,
    accountId,
    currency,
    startDate: dtStart,
    endDate: dtEnd,
    balance,
    transactions,
  };
}

/** Pega o primeiro valor da tag — funciona pra SGML (sem fechamento) e XML (com). */
function pickValue(content: string, tag: string): string | undefined {
  // SGML: <TAG>valor (até próxima tag ou newline)
  const sgmlMatch = new RegExp(`<${tag}>([^<\\r\\n]+)`, 'i').exec(content);
  if (sgmlMatch && sgmlMatch[1] !== undefined) {
    return sgmlMatch[1].trim();
  }
  // XML: <TAG>valor</TAG>
  const xmlMatch = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(content);
  if (xmlMatch && xmlMatch[1] !== undefined) {
    return xmlMatch[1].trim();
  }
  return undefined;
}

function sliceBlock(content: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = re.exec(content);
  return m ? m[1] : undefined;
}

/** Aceita YYYYMMDD, YYYYMMDDHHMMSS e ISO. */
function parseOfxDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const clean = value.replace(/\[.*?\]$/, '').trim();

  // YYYYMMDD ou YYYYMMDDHHMMSS
  const m = /^(\d{4})(\d{2})(\d{2})(?:(\d{2})(\d{2})(\d{2}))?/.exec(clean);
  if (m) {
    const [, y, mo, d, hh, mm, ss] = m;
    return new Date(
      Date.UTC(
        parseInt(y!, 10),
        parseInt(mo!, 10) - 1,
        parseInt(d!, 10),
        hh ? parseInt(hh, 10) : 12,
        mm ? parseInt(mm, 10) : 0,
        ss ? parseInt(ss, 10) : 0,
      ),
    );
  }
  const fallback = new Date(clean);
  return isNaN(fallback.getTime()) ? undefined : fallback;
}
