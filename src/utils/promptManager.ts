import { storage } from './storage'
import type { PromptConfig } from '../types'
import { DEFAULT_PROMPTS } from '../types'

export function getPrompts(): PromptConfig {
  const settings = storage.getSettings()
  return settings.prompts || DEFAULT_PROMPTS
}

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

  // 替换占位符
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

  // 替换占位符
  prompt = prompt.replace(/{{novelTitle}}/g, novelTitle || '未设置')
  prompt = prompt.replace(/{{novelDescription}}/g, novelDescription || '未设置')
  prompt = prompt.replace(/{{chapterTitle}}/g, chapterTitle || '未设置')
  prompt = prompt.replace(/{{previousChapterTitle}}/g, previousChapterTitle || '无')
  prompt = prompt.replace(/{{previousChapterDescription}}/g, previousChapterDescription || '无')

  return prompt
}

export function resetPrompts(): PromptConfig {
  return DEFAULT_PROMPTS
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

export function buildNovelDescriptionPrompt(
  input: string
): string {
  const prompts = getPrompts()
  let prompt = prompts.generateNovelDescription

  prompt = prompt.replace(/{{input}}/g, input || '未设置')

  return prompt
}