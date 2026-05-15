export interface UrlEntry {
  name: string
  url: string
  summary: string
  category: string
  tags: string[]
  stackFit?: {
    verdict: string
    explanation: string
  }
}
