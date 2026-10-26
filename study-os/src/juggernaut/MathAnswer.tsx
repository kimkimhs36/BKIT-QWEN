/** Numeric entry matches BUILD 01's numeric scoring contract. Symbolic math is not silently accepted. */
export function MathAnswer({
  label = 'x의 값',
  fractions = false,
  value,
  onChange,
}: {
  label?: string;
  fractions?: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="jg-math-answer">
      <label className="jg-field">
        {label}
        <input
          aria-label={label}
          autoComplete="off"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, 100))}
          placeholder={fractions ? '예: -2, 0.5, 1/2' : '음수는 - 기호를 사용하세요'}
        />
      </label>
      <details>
        <summary>숫자·부호 입력 도구</summary>
        <div className="jg-number-pad" role="group" aria-label="숫자와 부호 입력">
          {[
            '1',
            '2',
            '3',
            '4',
            '5',
            '6',
            '7',
            '8',
            '9',
            '−',
            '0',
            '.',
            ...(fractions ? ['/'] : []),
          ].map((key) => (
            <button
              type="button"
              key={key}
              onClick={() =>
                onChange(
                  (key === '−'
                    ? value.startsWith('-')
                      ? value.slice(1)
                      : '-' + value
                    : value + key
                  ).slice(0, 100),
                )
              }
            >
              {key}
            </button>
          ))}
          <button type="button" onClick={() => onChange(value.slice(0, -1))}>
            한 글자 지우기
          </button>
          <button type="button" onClick={() => onChange('')}>
            입력 비우기
          </button>
        </div>
        <small>
          {fractions
            ? '정수·소수·정수/정수 분수를 입력할 수 있어요. 근호·기호식·계산식 채점은 지원하지 않습니다.'
            : '기존 방정식 문항은 정수·소수 답안을 사용합니다. 분수·기호식 채점은 지원하지 않습니다.'}
        </small>
      </details>
    </div>
  );
}
