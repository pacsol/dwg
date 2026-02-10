export interface LayerInfo {
  name: string;
  color: number;
  color_name: string;
  visible: boolean;
  entity_count: number;
  line_length: number;
  closed_area: number;
}

export interface BoundingBox {
  min_x: number;
  min_y: number;
  min_z: number;
  max_x: number;
  max_y: number;
  max_z: number;
  width: number;
  height: number;
  depth: number;
}

export interface Measurements {
  total_entities: number;
  bounding_box: BoundingBox;
  total_line_length: number;
  total_closed_area: number;
  dimensions: DimensionData[];
}

export interface DimensionData {
  type: string;
  layer: string;
  text: string;
  actual_measurement: number;
  dimstyle: string;
  defpoint?: number[];
  text_midpoint?: number[];
}

export interface GeometryEntity {
  type: string;
  layer: string;
  color: number;
  data: {
    start?: number[];
    end?: number[];
    points?: number[][];
    closed?: boolean;
    center?: number[];
    radius?: number;
    start_angle?: number;
    end_angle?: number;
    position?: number[];
    text?: string;
    height?: number;
    rotation?: number;
    paths?: number[][][];
  };
}

export interface PreviewData {
  file_id: string;
  filename: string;
  bounding_box: BoundingBox;
  entities: GeometryEntity[];
}

export interface UploadResponse {
  success: boolean;
  file_id: string;
  filename: string;
  message: string;
}

export interface LayerResponse {
  file_id: string;
  filename: string;
  layers: LayerInfo[];
}

export interface MeasurementResponse {
  file_id: string;
  filename: string;
  measurements: Measurements;
}
