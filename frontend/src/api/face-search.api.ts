import { defineApi } from "@phamphong94/query-client";
import { api } from "./api";

export interface Person {
  id: string;
  name: string;
  created_at: string;
  face_count: number;
}

export interface Face {
  id: string;
  box: number[] | null;
  person_id: string | null;
  person_name: string | null;
}

export interface ImageResult {
  id: string;
  file_path: string;
  created_at: string;
  faces: Face[];
}

export interface ImageSearchResponse {
  items: ImageResult[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface SearchParams {
  person_id?: string;
  page?: number;
  size?: number;
}

export interface PersonParams {
  name?: string;
  limit?: number;
}

export class FaceSearchApi {
  async listPersons(params: PersonParams): Promise<Person[]> {
    const res = await api.get<Person[]>('/persons', { params });
    return res.data;
  }
  
  async searchImages(params: SearchParams): Promise<ImageSearchResponse> {
    const res = await api.get<ImageSearchResponse>('/images', { params });
    return res.data;
  }

  async searchImagesByName(params: { name: string, page?: number, size?: number }): Promise<ImageSearchResponse> {
    const res = await api.get<ImageSearchResponse>('/images/by-name', { params });
    return res.data;
  }

    async upload(formData: FormData, onProgress?: (progress: number) => void): Promise<ImageResult> {
        const res = await api.post<ImageResult>('/images', formData, {
            onUploadProgress: (progressEvent) => {
                if (onProgress && progressEvent.total) {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    onProgress(percentCompleted);
                }
            }
        });
        return res.data;
    }
  
  async uploadBatch(formData: FormData): Promise<ImageResult[]> {
    const res = await api.post<ImageResult[]>('/images/batch', formData);
    return res.data;
  }
  async createPersonFromFace(data: { name: string, face_id: string }): Promise<Person> {
    const res = await api.post<Person>('/persons/from-face', data);
    return res.data;
  }
}

export const faceSearchApiDef = defineApi(new FaceSearchApi(), {
  queries: {
    listPersons: {
      getQueryKey: (params) => ['persons', params]
    },
    searchImages: {
      getQueryKey: (params) => ['images', params]
    },
    searchImagesByName: {
      getQueryKey: (params) => ['images-by-name', params]
    }
  },
  mutations: {
    upload: {
      invalidates: [['images-by-name']] 
    },
    uploadBatch: {
      invalidates: [['images-by-name']] 
    },
    createPersonFromFace: {
      invalidates: [['images-by-name']] 
    }
  }
});
