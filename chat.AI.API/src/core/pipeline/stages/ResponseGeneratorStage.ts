/**
* Stage 5: Response Generator
* Genera respuestas usando templates o LLM
*/

import { PipelineStage } from './PreprocessorStage';
import { ProcessedMessage, GeneratedResponse, QuickReply } from '../../../models/types';
import { engineClient } from '../../clients/EngineClient';

export class ResponseGeneratorStage implements PipelineStage {
  name = 'response_generator';
  critical = true;

  async execute(context: ProcessedMessage): Promise<ProcessedMessage> {
    const { intent, actionResult, tenantConfig } = context;

    // Elegir estrategia de generacion
    const strategy = this.selectStrategy(intent?.name, tenantConfig);

    let response: GeneratedResponse;

    switch (strategy) {
      case 'template':
        response = await this.generateFromTemplate(context);
        break;
      case 'llm':
        response = await this.generateWithLLM(context);
        break;
      case 'hybrid':
        response = await this.generateHybrid(context);
        break;
      default:
        response = await this.generateWithLLM(context);
    }

    response = await this.personalize(response, context);

    if (actionResult?.needsMoreInfo || actionResult?.suggestions) {
      response.quickReplies = await this.generateQuickReplies(context);
    }

    if (actionResult?.multipleResults && actionResult?.csvDownloadId) {
      response.attachments = [
        ...(response.attachments ?? []),
        { type: 'csv', id: actionResult.csvDownloadId }
      ];
    }

    context.response = response;
    context.metadata.generationStrategy = strategy;
    return context;
  }

  private selectStrategy(intentName?: string, tenantConfig?: any): 'template' | 'llm' | 'hybrid' {
    // Intenciones cuyo handler ya produce el mensaje final (no deben ir al LLM)
    const simpleIntents = ['saludo', 'despedida', 'search_texts', 'search_criteria', 'search_activities'];

    if (intentName && simpleIntents.includes(intentName)) {
      return 'template';
    }

    if (tenantConfig?.aiConfig?.provider) {
      return 'llm';
    }

    return 'hybrid';
  }

  private async generateFromTemplate(context: ProcessedMessage): Promise<GeneratedResponse> {
    const { intent, actionResult } = context;
    const templates: { [key: string]: string } = {
      saludo: '{greeting} {message}',
      despedida: '{message}',
      consulta_precio: 'El precio de {product} es ${final} {currency}. Tenemos {stock} unidades disponibles.',
      consulta_stock: 'Tenemos {stock} unidades de {product} en stock.'
    };

    const template = templates[intent?.name || ''];
    let content: string;

    if (actionResult?.message) {
      // El handler ya generó el mensaje final (ej. varios resultados, no encontrado,
      // paridad, colaboradores): usarlo directamente, tiene prioridad sobre el template.
      content = actionResult.message;
    } else if (template) {
      // Hay un template específico para la intención: rellenar con los datos
      content = actionResult?.data ? this.replaceVariables(template, actionResult.data) : template;
    } else {
      content = '{message}';
    }

    return {
      content,
      type: 'text',
      quickReplies: [],
      attachments: []
    };
  }

  private async generateWithLLM(context: ProcessedMessage): Promise<GeneratedResponse> {
    const { session, tenantConfig } = context;
    const contextPrompt = this.buildContextPrompt(context);

    const history = (session?.messages || [])
      .filter((m: any) => m.role === 'user' || m.role === 'assistant')
      .slice(-10)
      .map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const systemPrompt = `Eres Mandi, asistente de ${tenantConfig?.name || 'la empresa'}.
Respondes siempre de forma natural, amigable y util.
Nunca inventes datos que no te hayan sido proporcionados.`;

    const llmResponse = await engineClient.generate({
      prompt: contextPrompt,
      systemPrompt,
      messages: history,
      temperature: 0.7,
      maxTokens: 300
    });

    return {
      content: llmResponse.content,
      type: 'text',
      quickReplies: [],
      attachments: [],
      metadata: {
        model: llmResponse.model,
        tokens: llmResponse.usage
      }
    };
  }

  private async generateHybrid(context: ProcessedMessage): Promise<GeneratedResponse> {
    const templateResponse = await this.generateFromTemplate(context);

    if (templateResponse.content && !templateResponse.content.includes('{')) {
      return templateResponse;
    }

    return await this.generateWithLLM(context);
  }

  private buildContextPrompt(context: ProcessedMessage): string {
    const { intent, actionResult, userProfile } = context;
    let prompt = '';

    if (intent?.name) {
      prompt += `Intencion detectada: ${intent.name} (confianza: ${Math.round((intent.confidence || 0) * 100)}%)\n`;
    }

    if (userProfile?.name) {
      prompt += `Usuario: ${userProfile.name} (${userProfile.tier || 'Regular'})\n`;
    }

    if (actionResult?.success && actionResult.data) {
      prompt += `\nDatos obtenidos:\n${JSON.stringify(actionResult.data, null, 2)}\n`;
    }

    if (actionResult?.productNotFound) {
      prompt += '\nNo se encontro el producto solicitado.\n';
    }

    if (actionResult?.multipleResults) {
      const count = actionResult.data?.count ?? 'varios';
      const term = actionResult.data?.searchTerm ?? '';
      prompt += `\nSe encontraron ${count} productos que coinciden con "${term}". Se genero un CSV para descargar.\n`;
    }

    if (actionResult?.needsMoreInfo) {
      prompt += `\nNecesitas preguntar al usuario: ${actionResult.question}\n`;
    }

    prompt += '\nResponde de forma natural y util basandote en los datos anteriores y el historial de conversacion.';
    return prompt;
  }

  private replaceVariables(template: string, data: any): string {
    let result = template;

    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      result = result.replace(regex, String(value));
    });

    return result;
  }

  private async personalize(response: GeneratedResponse, context: ProcessedMessage): Promise<GeneratedResponse> {
    const { userProfile } = context;

    if (userProfile?.name && Math.random() > 0.7) {
      response.content = `${userProfile.name}, ${response.content}`;
    }

    return response;
  }

  private async generateQuickReplies(context: ProcessedMessage): Promise<QuickReply[]> {
    const { actionResult } = context;
    const replies: QuickReply[] = [];

    if (actionResult?.suggestions) {
      actionResult.suggestions.forEach((suggestion: any) => {
        replies.push({
          label: suggestion.name || suggestion,
          value: suggestion.name || suggestion
        });
      });
    }

    if (replies.length > 0) {
      replies.push({
        label: 'Hablar con un agente',
        value: '/human_agent'
      });
    }

    return replies;
  }
}
