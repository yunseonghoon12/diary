import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export type TeacherReplyInput = {
  entryDate: string;
  weather: string | null;
  wakeTime: string | null;
  content: string | null;
  hasPicture: boolean;
};

@Injectable()
export class TeacherReplyService {
  private readonly logger = new Logger(TeacherReplyService.name);
  private readonly client: OpenAI | null;

  constructor(private readonly config: ConfigService) {
    const key = this.config.get<string>('OPENAI_API_KEY')?.trim();
    this.client = key ? new OpenAI({ apiKey: key }) : null;
  }

  async generateReply(input: TeacherReplyInput): Promise<string | null> {
    if (!this.client) {
      this.logger.warn('OPENAI_API_KEY 가 없어 선생님 답글을 건너뜁니다.');
      return null;
    }

    const parts: string[] = [
      `일기 날짜: ${input.entryDate}`,
      `날씨: ${input.weather ?? '(미입력)'}`,
      `기상 시간: ${input.wakeTime ?? '(미입력)'}`,
      `글 내용: ${input.content?.trim() ? input.content.trim() : '(비어 있음)'}`,
      `그림/사진 포함: ${input.hasPicture ? '예' : '아니오'}`,
    ];
    const studentContext = parts.join('\n');

    try {
      const res = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 450,
        temperature: 0.75,
        messages: [
          {
            role: 'system',
            content: `당신은 초등학교 담임 선생님입니다. 학생이 그림일기를 제출했을 때 짧고 따뜻하게 격려하는 답글을 한국어로 씁니다.
- 존댓말은 쓰지 말고, 학생에게 말하듯 반말·친근한 톤(예: ~했구나, ~네, 선생님은 ~해)을 씁니다.
- 4~7문장 정도. 과장된 칭찬보다 구체적으로 오늘 글·날씨·기상·그림 여부 중 실제로 적힌 것을 골라 언급합니다.
- 가르치려 들거나 평가표 같은 말투는 피합니다.`,
          },
          {
            role: 'user',
            content: `아래 내용을 바탕으로 선생님 답글만 작성해 줘.\n\n${studentContext}`,
          },
        ],
      });
      const text = res.choices[0]?.message?.content?.trim();
      return text && text.length > 0 ? text : null;
    } catch (e) {
      this.logger.error(
        'OpenAI 선생님 답글 생성 실패',
        e instanceof Error ? e.stack : e,
      );
      return null;
    }
  }
}
