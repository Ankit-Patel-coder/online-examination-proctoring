// client/src/components/ui/Card.jsx
import { cn } from '../../utils/cn';

/**
 * Card container with optional header, body, and footer sections.
 * 
 * @example
 * <Card>
 *   <Card.Header title="Exam Results" action={<Button>Export</Button>} />
 *   <Card.Body>content</Card.Body>
 *   <Card.Footer>footer</Card.Footer>
 * </Card>
 */
const Card = ({ children, className, hover = false, ...props }) => (
  <div
    className={cn(hover ? 'card-hover' : 'card', className)}
    {...props}
  >
    {children}
  </div>
);

const CardHeader = ({ title, description, action, className }) => (
  <div
    className={cn(
      'flex items-start justify-between gap-4 px-6 py-4 border-b border-surface-200',
      className
    )}
  >
    <div>
      {title && <h3 className="text-base font-semibold text-surface-900">{title}</h3>}
      {description && <p className="text-sm text-surface-500 mt-0.5">{description}</p>}
    </div>
    {action && <div className="flex-shrink-0">{action}</div>}
  </div>
);

const CardBody = ({ children, className }) => (
  <div className={cn('px-6 py-5', className)}>{children}</div>
);

const CardFooter = ({ children, className }) => (
  <div
    className={cn(
      'px-6 py-4 border-t border-surface-200 bg-surface-50 rounded-b-xl',
      className
    )}
  >
    {children}
  </div>
);

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card;
