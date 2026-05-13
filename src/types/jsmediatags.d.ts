declare module "jsmediatags/dist/jsmediatags.min.js" {
  interface ReadCallbacks {
    onSuccess: (result: { tags: Record<string, any> }) => void;
    onError: (error: any) => void;
  }
  const jsmediatags: {
    read: (file: File | Blob | string, callbacks: ReadCallbacks) => void;
  };
  export default jsmediatags;
}
