extends Area2D
class_name FlyingToilet

@export var requires_slide: bool = true
var time_elapsed: float = 0.0
var base_y: float = 0.0

func _ready() -> void:
	base_y = position.y
	body_entered.connect(_on_body_entered)

func _process(dt: float) -> void:
	time_elapsed += dt
	position.y = base_y + sin(time_elapsed * 5.0) * 8.0
	queue_redraw()

func _on_body_entered(body: Node2D) -> void:
	if body is Player:
		var p := body as Player
		if p.is_sliding:
			# Safely slid underneath!
			p.near_miss_triggered.emit(global_position)
		else:
			p.hit_obstacle.emit(self)

func _draw() -> void:
	# 1. Downward red laser warning beam
	var laser_color := Color(0.94, 0.27, 0.27, 0.5)
	draw_dashed_line(Vector2(-20, 24), Vector2(-20, 110), laser_color, 2.0, 6.0)
	draw_dashed_line(Vector2(20, 24), Vector2(20, 110), laser_color, 2.0, 6.0)

	# Warning text
	var font = ThemeDB.fallback_font
	draw_string(font, Vector2(-46, 75), "▼ SLIDE ▼", HORIZONTAL_ALIGNMENT_CENTER, -1, 12, Color("#EF4444"))

	# 2. Trailing fluttering toilet paper streamer
	var wave1 = sin(time_elapsed * 12.0) * 6.0
	var wave2 = cos(time_elapsed * 14.0) * 5.0
	var paper_points = PackedVector2Array([
		Vector2(-10, -5),
		Vector2(-30, -8 + wave1),
		Vector2(-55, -2 + wave2),
		Vector2(-55, 10 + wave2),
		Vector2(-30, 4 + wave1),
		Vector2(-10, 5)
	])
	draw_colored_polygon(paper_points, Color("#FFFFFF"))
	draw_polyline(paper_points, Color("#CBD5E1"), 1.5)

	# 3. Dual Rocket Jet Thruster Flames
	var flame_len = 18.0 + sin(time_elapsed * 25.0) * 8.0
	# Outer orange cone
	draw_colored_polygon(PackedVector2Array([
		Vector2(-15, 6),
		Vector2(-15 - flame_len, 10),
		Vector2(-15, 14)
	]), Color("#F97316"))
	# Inner hot yellow cone
	draw_colored_polygon(PackedVector2Array([
		Vector2(-15, 8),
		Vector2(-15 - flame_len * 0.6, 10),
		Vector2(-15, 12)
	]), Color("#FEF08A"))

	# Thruster metal casing
	draw_rect(Rect2(-16, 4, 12, 12), Color("#334155"), true)
	draw_rect(Rect2(8, 4, 12, 12), Color("#334155"), true)

	# 4. Ceramic Cistern / Water Tank (Rear)
	draw_rect(Rect2(-12, -28, 22, 34), Color("#CBD5E1"), true)
	draw_rect(Rect2(-10, -26, 18, 30), Color("#FFFFFF"), true)
	draw_rect(Rect2(-14, -32, 26, 6), Color("#E2E8F0"), true)
	# Chrome handle
	draw_circle(Vector2(-16, -20), 3.5, Color("#94A3B8"))

	# 5. Porcelain Toilet Bowl
	draw_ellipse(Vector2(16, -4), 26, 18, Color("#FFFFFF"))
	draw_ellipse(Vector2(16, -4), 20, 12, Color("#0284C7")) # Blue water
	draw_ellipse(Vector2(18, -5), 14, 8, Color("#38BDF8")) # Swirling foam
	# Raised lid
	draw_rect(Rect2(2, -26, 6, 22), Color("#F8FAFC"), true)
	# Pedestal
	draw_rect(Rect2(8, 12, 16, 10), Color("#E2E8F0"), true)

	# Badge
	draw_string(font, Vector2(2, 28), "JET-WC", HORIZONTAL_ALIGNMENT_CENTER, -1, 10, Color("#F59E0B"))

func draw_ellipse(center: Vector2, rx: float, ry: float, color: Color) -> void:
	var points = PackedVector2Array()
	var segments = 16
	for i in range(segments):
		var theta = i * (2 * PI / segments)
		points.append(center + Vector2(cos(theta) * rx, sin(theta) * ry))
	draw_colored_polygon(points, color)
