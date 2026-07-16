/**
 * Root-level download/prepare route. Home floor cards push here so navigation
 * skips the nested tour stack + entitlement gate spinner (those caused the
 * laggy floor → download transition).
 */
export { TourPrepareScreen as default } from "@/components/tours/tour-prepare-screen";
