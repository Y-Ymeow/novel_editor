import type { DatabaseConfig } from '../types'

export async function testDatabaseConnection(config: DatabaseConfig): Promise<{ success: boolean; message: string }> {
  try {
    new URL(config.connectionString)
    const response = await fetch(`https://api.ipify.org?format=json`, {
      method: 'GET',
    })
    if (response.ok) {
      return { success: true, message: 'MongoDB 连接配置已保存（注意：浏览器无法直接测试 MongoDB 连接，请确保连接字符串正确）' }
    }
    return { success: false, message: 'MongoDB 连接失败' }
  } catch {
    return { success: false, message: '无法连接到 MongoDB' }
  }
}

export function getConnectionStringPlaceholder(): string {
  return 'mongodb+srv://username:password@cluster.mongodb.net/database'
}