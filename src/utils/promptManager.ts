import type { PromptConfig } from '../types'
import { DEFAULT_PROMPTS } from '../types'
import { storage } from './storage'

export function getPrompts(): PromptConfig {
  const settings = storage.getSettings()
  return settings.prompts || DEFAULT_PROMPTS
}

export function savePrompts(prompts: PromptConfig): void {
  const settings = storage.getSettings()
  settings.prompts = prompts
  storage.saveSettings(settings)
}

export function resetPrompts(): void {
  savePrompts(DEFAULT_PROMPTS)
}

// ============ Prompt 构建函数 ============

export function buildContentPrompt(
  novelTitle: string,
  novelDescription: string,
  characters: string,
  chapterTitle: string,
  chapterDescription: string,
  existingContent: string
): string {
  const prompts = getPrompts()
  let prompt = prompts.generateContent

  prompt = prompt.replace(/{{novelTitle}}/g, novelTitle || '未设置')
  prompt = prompt.replace(/{{novelDescription}}/g, novelDescription || '未设置')
  prompt = prompt.replace(/{{characters}}/g, characters || '无')
  prompt = prompt.replace(/{{chapterTitle}}/g, chapterTitle || '未设置')
  prompt = prompt.replace(/{{chapterDescription}}/g, chapterDescription || '未设置')
  prompt = prompt.replace(/{{existingContent}}/g, existingContent || '无')

  return prompt
}

export function buildDescriptionPrompt(
  novelTitle: string,
  novelDescription: string,
  chapterTitle: string,
  previousChapterTitle: string,
  previousChapterDescription: string
): string {
  const prompts = getPrompts()
  let prompt = prompts.generateDescription

  prompt = prompt.replace(/{{novelTitle}}/g, novelTitle || '未设置')
  prompt = prompt.replace(/{{novelDescription}}/g, novelDescription || '未设置')
  prompt = prompt.replace(/{{chapterTitle}}/g, chapterTitle || '未设置')
  prompt = prompt.replace(/{{previousChapterTitle}}/g, previousChapterTitle || '无')
  prompt = prompt.replace(/{{previousChapterDescription}}/g, previousChapterDescription || '无')

  return prompt
}

export function buildCharacterPrompt(
  novelTitle: string,
  novelDescription: string,
  input: string
): string {
  const prompts = getPrompts()
  let prompt = prompts.generateCharacter

  prompt = prompt.replace(/{{novelTitle}}/g, novelTitle || '未设置')
  prompt = prompt.replace(/{{novelDescription}}/g, novelDescription || '未设置')
  prompt = prompt.replace(/{{input}}/g, input || '未设置')

  return prompt
}

export function buildNovelDescriptionPrompt(input: string): string {
  const prompts = getPrompts()
  let prompt = prompts.generateNovelDescription

  prompt = prompt.replace(/{{input}}/g, input || '未设置')

  return prompt
}