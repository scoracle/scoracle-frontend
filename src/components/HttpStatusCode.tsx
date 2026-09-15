import { httpStatus } from "@solidjs/web";
export default function HttpStatusCode(props: {
    code: number;
}) {
    httpStatus(props.code);
    return null;
}
