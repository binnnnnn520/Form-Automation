import { QuestionRisk } from '../../shared/types';

const sensitivePatterns = [
  /政治|党派|宗教|立场/,
  /疾病|病史|健康隐私|心理健康|医疗/,
  /法律责任|承诺书|声明|保证/,
  /财务授权|扣款|银行卡|贷款|征信/,
  /身份证照片|人脸|生物识别/
];

export function classifyQuestionRisk(label: string): QuestionRisk {
  return sensitivePatterns.some((pattern) => pattern.test(label)) ? 'sensitive' : 'normal';
}
