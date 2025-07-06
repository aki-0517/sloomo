import axios from 'axios';
import { API_TIMEOUTS } from '../constants/api';
import { ApiResponse, ScoreRequest, ScoreResponse } from '../types/api';
import { apiEndpoints } from './endpoints';

class ScoreApi {
  private timeout = API_TIMEOUTS.CREDIT_SCORING;

  async calculateScore(request: ScoreRequest): Promise<ApiResponse<ScoreResponse>> {
    try {
      const response = await axios.post<ApiResponse<ScoreResponse>>(
        apiEndpoints.score(),
        request,
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Score calculation API error:', error);
      
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error: error.response?.data?.error || 'Credit scoring service unavailable',
        };
      }

      return {
        success: false,
        error: 'Unknown error occurred during credit scoring',
      };
    }
  }

  async getScoreHistory(
    userId: string,
    limit: number = 5
  ): Promise<ApiResponse<ScoreResponse[]>> {
    try {
      const response = await axios.get(
        `${apiEndpoints.score()}/history`,
        {
          params: { userId, limit },
          timeout: API_TIMEOUTS.DEFAULT,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Score history API error:', error);
      
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error: error.response?.data?.error || 'Network error occurred',
        };
      }

      return {
        success: false,
        error: 'Unknown error occurred',
      };
    }
  }

  async refreshScore(
    userId: string,
    walletAddress: string,
    includeZKProof: boolean = false
  ): Promise<ApiResponse<ScoreResponse>> {
    try {
      const response = await axios.post<ApiResponse<ScoreResponse>>(
        `${apiEndpoints.score()}/refresh`,
        {
          userId,
          walletAddress,
          includeZKProof,
        },
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Score refresh API error:', error);
      
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error: error.response?.data?.error || 'Score refresh failed',
        };
      }

      return {
        success: false,
        error: 'Unknown error occurred during score refresh',
      };
    }
  }

  async estimateCreditLine(
    creditScore: number,
    walletAddress: string
  ): Promise<ApiResponse<{ estimatedAmount: number; estimatedApr: number }>> {
    try {
      const response = await axios.post(
        `${apiEndpoints.score()}/estimate-credit`,
        {
          creditScore,
          walletAddress,
        },
        {
          timeout: API_TIMEOUTS.DEFAULT,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Credit line estimation API error:', error);
      
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error: error.response?.data?.error || 'Credit estimation failed',
        };
      }

      return {
        success: false,
        error: 'Unknown error occurred during credit estimation',
      };
    }
  }
}

export const scoreApi = new ScoreApi();