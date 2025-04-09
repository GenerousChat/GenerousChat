"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { motion, useMotionValue, useTransform } from "framer-motion"

// Fixed interface to use Omit to exclude defaultValue from HTMLAttributes
interface SliderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue'> {
  defaultValue?: number[]
  value?: number[]
  onValueChange?: (value: number[]) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  orientation?: "horizontal" | "vertical"
  dir?: "ltr" | "rtl"
  inverted?: boolean
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  ({
    className,
    defaultValue = [0],
    value,
    onValueChange,
    min = 0,
    max = 100,
    step = 1,
    disabled = false,
    orientation = "horizontal",
    dir = "ltr",
    inverted = false,
    ...props
  }, ref) => {
    const isControlled = value !== undefined
    const [localValues, setLocalValues] = React.useState<number[]>(defaultValue)
    const values = isControlled ? value : localValues
    
    const trackRef = React.useRef<HTMLDivElement>(null)
    // Create individual refs for each thumb instead of an array
    const thumbRefArray = React.useMemo(() => 
      Array.from({ length: values?.length || 0 }).map(() => React.createRef<HTMLDivElement>()),
    [values?.length])
    
    const isDragging = React.useRef<boolean[]>(values?.map(() => false) || [])
    
    // Get slider dimensions
    const getSliderDimensions = () => {
      if (!trackRef.current) return { width: 0, left: 0 }
      const rect = trackRef.current.getBoundingClientRect()
      return {
        width: rect.width,
        left: rect.left
      }
    }
    
    // Convert value to percentage
    const valueToPercentage = (value: number) => {
      return ((value - min) / (max - min)) * 100
    }
    
    // Convert percentage to value
    const percentageToValue = (percentage: number) => {
      const rawValue = ((percentage / 100) * (max - min)) + min
      const steppedValue = Math.round(rawValue / step) * step
      return Math.max(min, Math.min(max, steppedValue))
    }
    
    // Convert client position to percentage
    const positionToPercentage = (clientX: number) => {
      const { width, left } = getSliderDimensions()
      const position = clientX - left
      return inverted 
        ? 100 - ((position / width) * 100)
        : (position / width) * 100
    }
    
    // Get thumb styles based on values
    const getThumbStyle = (index: number) => {
      const value = values?.[index] || 0
      const percentage = valueToPercentage(value)
      return {
        left: `${percentage}%`,
        transform: 'translate(-50%, 0)'
      }
    }
    
    // Get range style based on values
    const getRangeStyle = () => {
      if (!values?.length) return {}
      
      // Sort values for proper range display
      const sortedValues = [...values].sort((a, b) => a - b)
      const startPercentage = valueToPercentage(sortedValues[0])
      const endPercentage = valueToPercentage(sortedValues[sortedValues.length - 1])
      
      return {
        left: `${startPercentage}%`,
        width: `${endPercentage - startPercentage}%`
      }
    }
    
    // Handle mouse down on thumb
    const handleThumbMouseDown = (index: number) => (e: React.MouseEvent) => {
      if (disabled) return
      
      e.preventDefault()
      isDragging.current[index] = true
      
      // Update the focused thumb
      thumbRefArray[index]?.current?.focus()
      
      // Get initial position
      const initialPosition = positionToPercentage(e.clientX)
      const initialValue = percentageToValue(initialPosition)
      
      // Update value
      const newValues = [...(values || [])]
      newValues[index] = initialValue
      
      if (!isControlled) {
        setLocalValues(newValues)
      }
      
      onValueChange?.(newValues)
      
      // Add document event listeners
      document.addEventListener('mousemove', handleMouseMove(index))
      document.addEventListener('mouseup', handleMouseUp(index))
    }
    
    // Handle mouse move (drag)
    const handleMouseMove = (index: number) => (e: MouseEvent) => {
      if (!isDragging.current[index]) return
      
      const percentage = positionToPercentage(e.clientX)
      const newValue = percentageToValue(percentage)
      
      // Update value
      const newValues = [...(values || [])]
      newValues[index] = newValue
      
      if (!isControlled) {
        setLocalValues(newValues)
      }
      
      onValueChange?.(newValues)
    }
    
    // Handle mouse up
    const handleMouseUp = (index: number) => () => {
      isDragging.current[index] = false
      
      // Remove document event listeners
      document.removeEventListener('mousemove', handleMouseMove(index))
      document.removeEventListener('mouseup', handleMouseUp(index))
    }
    
    // Handle track click
    const handleTrackMouseDown = (e: React.MouseEvent) => {
      if (disabled || !values?.length) return
      
      // Find nearest thumb and update its value
      const percentage = positionToPercentage(e.clientX)
      const newValue = percentageToValue(percentage)
      
      // Find closest thumb
      let closestThumbIndex = 0
      let closestDistance = Math.abs(values[0] - newValue)
      
      for (let i = 1; i < values.length; i++) {
        const distance = Math.abs(values[i] - newValue)
        if (distance < closestDistance) {
          closestDistance = distance
          closestThumbIndex = i
        }
      }
      
      // Update value for closest thumb
      const newValues = [...values]
      newValues[closestThumbIndex] = newValue
      
      if (!isControlled) {
        setLocalValues(newValues)
      }
      
      onValueChange?.(newValues)
    }
    
    return (
      <div
        ref={ref}
        className={cn(
          "relative flex w-full touch-none select-none items-center",
          disabled && "opacity-50 cursor-not-allowed pointer-events-none",
          className
        )}
        {...props}
      >
        <motion.div
          ref={trackRef}
          className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary"
          onMouseDown={handleTrackMouseDown}
        >
          <motion.div
            className="absolute h-full bg-primary"
            style={getRangeStyle()}
            initial={{ width: 0 }}
            animate={{ width: getRangeStyle().width, left: getRangeStyle().left }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        </motion.div>
        
        {values?.map((value, i) => (
          <motion.div
            key={i}
            ref={thumbRefArray[i]}
            role="slider"
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={value}
            tabIndex={disabled ? -1 : 0}
            className={cn(
              "absolute block h-5 w-5 rounded-full border-2 border-primary bg-background",
              "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "transition-colors hover:scale-110",
              disabled ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing"
            )}
            style={getThumbStyle(i)}
            onMouseDown={handleThumbMouseDown(i)}
            initial={{
              x: "-50%",
              scale: 0.9,
            }}
            animate={{
              x: "-50%",
              scale: isDragging.current[i] ? 1.1 : 1,
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        ))}
      </div>
    )
  }
)

Slider.displayName = "Slider"

export { Slider }
