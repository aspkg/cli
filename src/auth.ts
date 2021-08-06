import blake3 from "blake3";

export function getHash(data: string): string {
	return blake3.hash(data).toString();
}
