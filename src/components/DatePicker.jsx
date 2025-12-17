import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { USE_EXTERNAL_API } from '../config/apiConfig'
import { getToday } from '../utils/dateUtils'
import './DatePicker.css'

function DatePicker({ selectedDate, onDateChange }) {
  const [availableDates, setAvailableDates] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [allowAnyDate, setAllowAnyDate] = useState(false) // 是否允许选择任意日期

  useEffect(() => {
    loadAvailableDates()
  }, [])

  const loadAvailableDates = async () => {
    try {
      if (USE_EXTERNAL_API) {
        // 使用外部API时，允许选择任意日期
        console.log('🌐 [DatePicker] 使用外部API，允许选择任意日期');
        setAllowAnyDate(true);
        // 生成最近30天的日期列表作为默认可用日期
        const dates = [];
        const today = new Date();
        for (let i = 0; i < 30; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          dates.push({
            date: dateStr,
            dateStr: dateStr,
            display: formatDisplayDate(dateStr),
            timestamp: date.getTime()
          });
        }
        setAvailableDates(dates);
        // 如果没有选中的日期，默认选择今天
        if (!selectedDate) {
          const todayStr = getToday();
          onDateChange(todayStr);
          setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
        } else {
          const selected = new Date(selectedDate);
          setCurrentMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
        }
      } else {
        // 使用本地API时，从后端获取可用日期列表
        console.log('💾 [DatePicker] 使用本地API，从后端获取日期列表');
        const response = await axios.get('/api/dates')
        console.log('获取到的日期列表:', response.data)
        setAvailableDates(response.data)
        // 如果没有选中的日期，默认选择最新的
        if (!selectedDate && response.data.length > 0) {
          onDateChange(response.data[0].date)
          // 设置当前月份为最新日期的月份
          const latestDate = new Date(response.data[0].date)
          setCurrentMonth(new Date(latestDate.getFullYear(), latestDate.getMonth(), 1))
        } else if (selectedDate) {
          // 如果有选中的日期，设置当前月份为选中日期的月份
          const selected = new Date(selectedDate)
          setCurrentMonth(new Date(selected.getFullYear(), selected.getMonth(), 1))
        }
      }
    } catch (error) {
      console.error('加载日期列表失败:', error)
      console.error('错误详情:', error.response?.data || error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDateSelect = (date) => {
    onDateChange(date)
    setIsOpen(false)
  }

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '选择日期'
    // Parse as UTC (YYYY-MM-DD is interpreted as UTC midnight)
    const date = new Date(dateStr)

    // Get today's date in UTC
    const now = new Date()
    const todayUTC = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`

    if (dateStr === todayUTC) {
      return '今天'
    }

    // Get yesterday in UTC
    const yesterday = new Date(now)
    yesterday.setUTCDate(yesterday.getUTCDate() - 1)
    const yesterdayUTC = `${yesterday.getUTCFullYear()}-${String(yesterday.getUTCMonth() + 1).padStart(2, '0')}-${String(yesterday.getUTCDate()).padStart(2, '0')}`

    if (dateStr === yesterdayUTC) {
      return '昨天'
    }

    // Use UTC methods to display the date
    return `${date.getUTCMonth() + 1}月${date.getUTCDate()}日`
  }

  // 获取可用日期的Set，用于快速查找
  const availableDatesSet = useMemo(() => {
    if (allowAnyDate) {
      // 如果允许任意日期，所有日期都可用
      return null; // null表示所有日期都可用
    }
    return new Set(availableDates.map(d => d.date))
  }, [availableDates, allowAnyDate])

  // 生成日历数据
  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    
    // 获取当月第一天和最后一天
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    // 获取第一天是星期几（0=周日，1=周一...）
    const firstDayWeek = firstDay.getDay()
    
    // 生成日历数组
    const days = []
    
    // 添加上个月的最后几天（用于填充第一周）
    const prevMonthLastDay = new Date(year, month, 0).getDate()
    for (let i = firstDayWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i)
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      days.push({
        date: date,
        dateStr: dateStr,
        isCurrentMonth: false,
        isAvailable: allowAnyDate || (availableDatesSet && availableDatesSet.has(dateStr))
      })
    }
    
    // 添加当月的所有日期
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day)
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      days.push({
        date: date,
        dateStr: dateStr,
        isCurrentMonth: true,
        isAvailable: allowAnyDate || (availableDatesSet && availableDatesSet.has(dateStr))
      })
    }
    
    // 添加下个月的前几天（用于填充最后一周）
    const totalDays = days.length
    const remainingDays = 42 - totalDays // 6行 x 7列 = 42
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day)
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      days.push({
        date: date,
        dateStr: dateStr,
        isCurrentMonth: false,
        isAvailable: allowAnyDate || (availableDatesSet && availableDatesSet.has(dateStr))
      })
    }
    
    return days
  }, [currentMonth, availableDatesSet, allowAnyDate])

  // 切换月份
  const changeMonth = (direction) => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
  }

  // 跳转到今天
  const goToToday = () => {
    const today = new Date()
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1))
  }

  // 判断是否是今天
  const isToday = (date) => {
    const today = new Date()
    return date.getFullYear() === today.getFullYear() &&
           date.getMonth() === today.getMonth() &&
           date.getDate() === today.getDate()
  }

  // 判断是否是选中的日期
  const isSelected = (dateStr) => {
    return selectedDate === dateStr
  }

  const selectedDateInfo = availableDates.find(d => d.date === selectedDate)
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', 
                      '七月', '八月', '九月', '十月', '十一月', '十二月']

  if (loading) {
    return (
      <div className="date-picker-loading">
        <span>加载中...</span>
      </div>
    )
  }

  return (
    <div className="date-picker-container">
      <button
        className="date-picker-button"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <span className="date-picker-icon">📅</span>
        <span className="date-picker-text">
          {selectedDateInfo ? selectedDateInfo.display : formatDisplayDate(selectedDate)}
        </span>
        <span className="date-picker-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <>
          <div
            className="date-picker-overlay"
            onClick={() => setIsOpen(false)}
          />
          <div className="date-picker-calendar">
            <div className="date-picker-header">
              <button
                className="date-picker-nav-button"
                onClick={() => changeMonth('prev')}
                type="button"
              >
                ‹
              </button>
              <div className="date-picker-month-year">
                <span>{currentMonth.getFullYear()}年</span>
                <span>{monthNames[currentMonth.getMonth()]}</span>
              </div>
              <button
                className="date-picker-nav-button"
                onClick={() => changeMonth('next')}
                type="button"
              >
                ›
              </button>
            </div>

            <div className="date-picker-weekdays">
              {weekDays.map(day => (
                <div key={day} className="date-picker-weekday">
                  {day}
                </div>
              ))}
            </div>

            <div className="date-picker-days">
              {calendarData.map((dayInfo, index) => {
                const dayClass = [
                  'date-picker-day',
                  !dayInfo.isCurrentMonth ? 'other-month' : '',
                  !dayInfo.isAvailable ? 'unavailable' : '',
                  isToday(dayInfo.date) ? 'today' : '',
                  isSelected(dayInfo.dateStr) ? 'selected' : ''
                ].filter(Boolean).join(' ')

                return (
                  <button
                    key={index}
                    className={dayClass}
                    onClick={() => dayInfo.isAvailable && handleDateSelect(dayInfo.dateStr)}
                    disabled={!dayInfo.isAvailable}
                    type="button"
                    title={dayInfo.isAvailable ? dayInfo.dateStr : '无数据'}
                  >
                    {dayInfo.date.getDate()}
                  </button>
                )
              })}
            </div>

            <div className="date-picker-footer">
              <button
                className="date-picker-today-button"
                onClick={goToToday}
                type="button"
              >
                今天
              </button>
              <button
                className="date-picker-close-button"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                关闭
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default DatePicker
