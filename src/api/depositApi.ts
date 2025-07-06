import axios from 'axios';
import { API_TIMEOUTS } from '../constants/api';
import { ApiResponse, DepositRequest, DepositResponse } from '../types/api';
import { apiEndpoints } from './endpoints';

class DepositApi {
  private timeout = API_TIMEOUTS.BLOCKCHAIN_OPERATIONS;

  async deposit(request: DepositRequest): Promise<ApiResponse<DepositResponse>> {
    try {
      const response = await axios.post<ApiResponse<DepositResponse>>(
        apiEndpoints.deposit(),
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
      console.error('Deposit API error:', error);
      
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

  async validateDeposit(
    transactionSignature: string,
    expectedAmount: number
  ): Promise<ApiResponse<{ isValid: boolean; actualAmount: number }>> {
    try {
      const response = await axios.post(
        `${apiEndpoints.deposit()}/validate`,
        {
          transactionSignature,
          expectedAmount,
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
      console.error('Deposit validation API error:', error);
      
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

  async getDepositHistory(
    userId: string,
    limit: number = 10
  ): Promise<ApiResponse<DepositResponse[]>> {
    try {
      const response = await axios.get(
        `${apiEndpoints.deposit()}/history`,
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
      console.error('Deposit history API error:', error);
      
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
}

export const depositApi = new DepositApi();