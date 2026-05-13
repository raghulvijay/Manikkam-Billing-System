declare namespace google {
  namespace accounts {
    namespace oauth2 {
      interface TokenResponse {
        access_token: string;
        expires_in: number;
        token_type: string;
        scope: string;
        error?: string;
        error_description?: string;
      }

      interface TokenClient {
        callback: (resp: TokenResponse) => void;
        requestAccessToken(overrideConfig?: { prompt?: string }): void;
      }

      interface TokenClientConfig {
        client_id: string;
        scope: string;
        callback: (resp: TokenResponse) => void;
        error_callback?: (err: { type: string }) => void;
      }

      function initTokenClient(config: TokenClientConfig): TokenClient;
      function revoke(token: string, done?: () => void): void;
      function hasGrantedAllScopes(tokenResponse: TokenResponse, ...scopes: string[]): boolean;
    }
  }
}
