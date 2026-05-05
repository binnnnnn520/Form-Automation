import { describe, expect, it } from 'vitest';
import { classifyQuestionRisk } from '../../src/server/safety/risk';

describe('classifyQuestionRisk', () => {
  it('marks normal administrative questions as normal', () => {
    expect(classifyQuestionRisk('请填写姓名')).toBe('normal');
  });

  it('marks health privacy questions as sensitive', () => {
    expect(classifyQuestionRisk('请填写你的疾病史和健康隐私')).toBe('sensitive');
  });

  it('marks financial authorization questions as sensitive', () => {
    expect(classifyQuestionRisk('是否同意财务授权扣款')).toBe('sensitive');
  });
});
