export type MomentVideoProvider = 'bilibili' | 'youtube';

export type MomentExtensionType = 'github' | 'website' | 'music' | 'location';

export interface MomentExtension {
  type: MomentExtensionType;
  title: string;
  description?: string;
  url?: string;
}

export interface MomentItem {
  id: string;
  content: string;
  /** ISO 日期 */
  date: string;
  tags?: string[];
  images?: string[];
  video?: { provider: MomentVideoProvider; id: string };
  extension?: MomentExtension;
}
