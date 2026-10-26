export interface SavedImage {
  name: string;
  fullName: string;
  extension: string;
  mimeType: string;
  imageCanvas: HTMLCanvasElement;
  imageBase64: string;
  width: number;
  height: number;
}
export interface ImageFileInfo {
  name?: string;
  extension?: string;
  quality?: number;
}
export interface EditorConfig {
  source: string;
  tabsIds?: string[];
  defaultTabId?: string;
  defaultToolId?: string;
  defaultSavedImageName?: string;
  defaultSavedImageType?: string;
  savingPixelRatio?: number;
  previewPixelRatio?: number;
  closeAfterSave?: boolean;
  showBackButton?: boolean;
  translations?: Record<string, string>;
  theme?: { typography?: { fontFamily?: string } };
  Crop?: {
    presetsItems?: {
      titleKey: string;
      descriptionKey?: string;
      ratio: number;
    }[];
  };
  onBeforeSave?: (info: ImageFileInfo) => boolean | void;
  onSave?: (image: SavedImage, designState: object) => void | Promise<void>;
  onClose?: (reason: string, haveNotSavedChanges: boolean) => void;
  onModify?: (designState: object) => void;
}
export default class FilerobotImageEditor {
  static TABS: Record<
    'ADJUST' | 'FINETUNE' | 'FILTERS' | 'RESIZE' | 'ANNOTATE' | 'WATERMARK',
    string
  >;
  static TOOLS: Record<string, string>;
  constructor(container: HTMLElement, config: EditorConfig);
  render(config?: Partial<EditorConfig>): void;
  terminate(): void;
  getCurrentImgData(
    info?: ImageFileInfo,
    pixelRatio?: number,
    keepLoadingSpinnerShown?: boolean,
  ): { imageData: SavedImage; designState: object };
  updateState(state: object): void;
}
